package made.hospital.document.application;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;

import made.hospital.commun.exception.BusinessException;
import made.hospital.document.domaine.DemandeModele;
import made.hospital.document.domaine.FavoriModele;
import made.hospital.document.domaine.ModeleDocument;
import made.hospital.document.domaine.TypeDocument;
import made.hospital.document.infra.DemandeModeleRepository;
import made.hospital.document.infra.DocumentMedicalRepository;
import made.hospital.document.infra.FavoriModeleRepository;
import made.hospital.document.infra.ModeleDocumentRepository;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

/**
 * Modèles de documents : bibliothèque de l'hôpital, modèles des services gérés par leur chef,
 * galerie des médecins (favoris, plus utilisés) et demandes de modèles.
 */
@Service
public class ModeleService
{

    private static final Logger LOG = LoggerFactory.getLogger(ModeleService.class);

    private final ModeleDocumentRepository modeles;
    private final DemandeModeleRepository demandes;
    private final FavoriModeleRepository favoris;
    private final DocumentMedicalRepository documents;
    private final StructureDocument structure;
    private final ServiceHospitalierService services;
    private final Notifier notifier;

    public ModeleService(ModeleDocumentRepository modeles, DemandeModeleRepository demandes, FavoriModeleRepository favoris,
                         DocumentMedicalRepository documents, StructureDocument structure,
                         ServiceHospitalierService services, Notifier notifier)
    {
        this.modeles = modeles;
        this.demandes = demandes;
        this.favoris = favoris;
        this.documents = documents;
        this.structure = structure;
        this.services = services;
        this.notifier = notifier;
    }

    // ---------- Modèle intégré ----------

    /**
     * Au démarrage : crée ou met à jour le « Document libre » livré avec le logiciel, recours du médecin quand son
     * service n'a pas de modèle adapté. Les autres modèles intégrés d'anciennes versions sont retirés.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void installerBibliotheque()
    {
        try (InputStream flux = new ClassPathResource("documents/bibliotheque.json").getInputStream())
        {
            JsonNode liste = structure.lire(new String(flux.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            Set<String> cles = new HashSet<>();
            liste.forEach(m -> cles.add(m.get("cle").asText()));
            retirerAnciensModelesIntegres(cles);
            for (JsonNode m : liste)
            {
                String json = structure.normaliser(m.get("structure"));
                ModeleDocument modele = modeles.findByCleSysteme(m.get("cle").asText()).orElseGet(ModeleDocument::new);
                boolean nouveau = modele.getId() == null;
                if (!nouveau && json.equals(modele.getStructure()) && m.get("nom").asText().equals(modele.getNom()))
                {
                    continue;
                }
                modele.setCleSysteme(m.get("cle").asText());
                modele.setNom(m.get("nom").asText());
                modele.setDescription(m.path("description").asText(null));
                modele.setType(TypeDocument.valueOf(m.get("type").asText()));
                modele.setSysteme(true);
                modele.setServiceId(null);
                modele.setStructure(json);
                modele.setStatut(ModeleDocument.Statut.PUBLIE);
                modele.setVersion(nouveau ? 1 : modele.getVersion() + 1);
                modele.setDatePublication(LocalDateTime.now());
                modele.setDateModification(LocalDateTime.now());
                modeles.save(modele);
            }
        }
        catch (IOException | RuntimeException e)
        {
            LOG.error("Modèle intégré non installé : {}", e.getMessage());
        }
    }

    /** Supprime un ancien modèle intégré jamais utilisé ; s'il a servi, il est archivé (les documents gardent leur copie). */
    private void retirerAnciensModelesIntegres(Set<String> clesConservees)
    {
        for (ModeleDocument ancien : modeles.findBySystemeTrueOrderByNomAsc())
        {
            if (clesConservees.contains(ancien.getCleSysteme()))
            {
                continue;
            }
            if (documents.existsByModeleId(ancien.getId()))
            {
                ancien.setStatut(ModeleDocument.Statut.ARCHIVE);
            }
            else
            {
                favoris.deleteByModeleId(ancien.getId());
                modeles.delete(ancien);
            }
        }
    }

    // ---------- Galerie du médecin ----------

    public record ModeleResume(Long id, String nom, String description, String type, String typeLibelle,
                               Long serviceId, boolean systeme, int version, String statut, int nombreChamps,
                               boolean favori, long utilisations, boolean libre)
    {
    }

    @Transactional(readOnly = true)
    public List<ModeleResume> galerie(UserDetailsImpl medecin, Long serviceId)
    {
        ServiceHospitalier service = services.serviceDeTravail(medecin, serviceId);
        Set<Long> favorisIds = favoris.findByMedecinId(medecin.getId()).stream()
                .map(FavoriModele::getModeleId).collect(Collectors.toSet());
        Map<Long, Long> utilisations = new HashMap<>();
        for (Object[] ligne : documents.utilisationsParModele(medecin.getId()))
        {
            utilisations.put((Long) ligne[0], (Long) ligne[1]);
        }
        return modeles.disponiblesPour(service.getId()).stream()
                .map(m -> resume(m, favorisIds.contains(m.getId()), utilisations.getOrDefault(m.getId(), 0L)))
                .sorted((a, b) ->
                {
                    if (a.favori() != b.favori())
                    {
                        return a.favori() ? -1 : 1;
                    }
                    if (a.utilisations() != b.utilisations())
                    {
                        return Long.compare(b.utilisations(), a.utilisations());
                    }
                    if (a.systeme() != b.systeme())
                    {
                        return a.systeme() ? 1 : -1;
                    }
                    return a.nom().compareToIgnoreCase(b.nom());
                })
                .toList();
    }

    @Transactional
    public boolean basculerFavori(UserDetailsImpl medecin, Long modeleId)
    {
        trouver(modeleId);
        return favoris.findByMedecinIdAndModeleId(medecin.getId(), modeleId)
                .map(f ->
                {
                    favoris.delete(f);
                    return false;
                })
                .orElseGet(() ->
                {
                    favoris.save(new FavoriModele(medecin.getId(), modeleId));
                    return true;
                });
    }

    /** Modèle publié utilisable dans le service donné. */
    @Transactional(readOnly = true)
    public ModeleDocument utilisable(Long modeleId, Long serviceId)
    {
        ModeleDocument modele = trouver(modeleId);
        if (modele.getStatut() != ModeleDocument.Statut.PUBLIE
                || (modele.getServiceId() != null && !modele.getServiceId().equals(serviceId)))
        {
            throw new BusinessException("Ce modèle n'est pas disponible dans votre service.");
        }
        return modele;
    }

    @Transactional(readOnly = true)
    public ModeleDocument lire(Long id)
    {
        return trouver(id);
    }

    // ---------- Gestion par le chef de service ----------

    public record ModeleDetail(ModeleResume resume, JsonNode structure)
    {
    }

    public record RequeteModele(Long serviceId, String nom, String description, String type, JsonNode structure)
    {
    }

    /** Modèles des services dirigés par le chef. */
    @Transactional(readOnly = true)
    public List<ModeleResume> modelesDuChef(UserDetailsImpl chef)
    {
        return modeles.findByServiceIdInOrderByNomAsc(idsDiriges(chef)).stream().map(m -> resume(m, false, 0)).toList();
    }

    @Transactional(readOnly = true)
    public ModeleDetail detail(UserDetailsImpl medecin, Long id)
    {
        ModeleDocument modele = trouver(id);
        boolean visible = modele.getServiceId() == null
                || services.idsServicesDuMedecin(medecin).contains(modele.getServiceId());
        if (!visible)
        {
            throw new BusinessException("Ce modèle appartient à un autre service.");
        }
        return new ModeleDetail(resume(modele, false, 0), structure.lire(modele.getStructure()));
    }

    @Transactional
    public ModeleDetail creer(UserDetailsImpl chef, RequeteModele requete)
    {
        exigerChef(chef, requete.serviceId());
        ModeleDocument modele = new ModeleDocument();
        modele.setServiceId(requete.serviceId());
        modele.setCreeParId(chef.getId());
        appliquer(modele, requete);
        mettreADisposition(chef, modele);
        return new ModeleDetail(resume(modeles.save(modele), false, 0), structure.lire(modele.getStructure()));
    }

    /** Modifie un modèle du service ; la nouvelle version s'applique aux prochains documents seulement. */
    @Transactional
    public ModeleDetail modifier(UserDetailsImpl chef, Long id, RequeteModele requete)
    {
        ModeleDocument modele = modeleDuChef(chef, id);
        if (modele.getStatut() == ModeleDocument.Statut.ARCHIVE)
        {
            throw new BusinessException("Un modèle archivé ne se modifie plus : copiez-le.");
        }
        appliquer(modele, requete);
        if (modele.getStatut() == ModeleDocument.Statut.PUBLIE)
        {
            modele.setVersion(modele.getVersion() + 1);
            modele.setDatePublication(LocalDateTime.now());
        }
        else
        {
            mettreADisposition(chef, modele); // ancien brouillon : disponible dès ce nouvel enregistrement
        }
        return new ModeleDetail(resume(modele, false, 0), structure.lire(modele.getStructure()));
    }

    /**
     * Pas d'étape de publication : un modèle enregistré par le chef est aussitôt disponible dans la galerie
     * des médecins du service, qui en sont notifiés.
     */
    private void mettreADisposition(UserDetailsImpl chef, ModeleDocument modele)
    {
        modele.setStatut(ModeleDocument.Statut.PUBLIE);
        modele.setDatePublication(LocalDateTime.now());
        String service = services.trouverService(modele.getServiceId()).map(ServiceHospitalier::getNom).orElse("");
        Set<Long> deja = new HashSet<>();
        for (Long medecinId : services.medecinsDuService(modele.getServiceId()))
        {
            if (!medecinId.equals(chef.getId()) && deja.add(medecinId))
            {
                notifier.notifier(medecinId, TypeNotification.MODELE_PUBLIE, "Nouveau modèle de document",
                        "Le modèle « " + modele.getNom() + " » est disponible dans le service " + service + ".",
                        "/medecin");
            }
        }
    }

    @Transactional
    public ModeleResume archiver(UserDetailsImpl chef, Long id)
    {
        ModeleDocument modele = modeleDuChef(chef, id);
        modele.setStatut(ModeleDocument.Statut.ARCHIVE);
        return resume(modele, false, 0);
    }

    /** Un modèle encore jamais utilisé peut être supprimé ; sinon il s'archive (les documents gardent leur copie). */
    @Transactional
    public void supprimer(UserDetailsImpl chef, Long id)
    {
        ModeleDocument modele = modeleDuChef(chef, id);
        if (documents.existsByModeleId(modele.getId()))
        {
            throw new BusinessException("Ce modèle a déjà servi à des documents : archivez-le plutôt.");
        }
        favoris.deleteByModeleId(modele.getId());
        modeles.delete(modele);
    }

    // ---------- Demandes de modèles ----------

    public record DemandeDto(Long id, Long serviceId, String serviceNom, String demandeur, String intitule,
                             String details, boolean structureProposee, String statut, Long modeleId,
                             String reponse, String dateCreation)
    {
    }

    @Transactional
    public DemandeDto demander(UserDetailsImpl medecin, String nomMedecin, Long serviceId, String intitule,
                               String details, String structureProposee)
    {
        ServiceHospitalier service = services.serviceDeTravail(medecin, serviceId);
        String titre = intitule == null ? "" : intitule.trim();
        if (titre.isEmpty())
        {
            throw new BusinessException("Indiquez le modèle dont vous avez besoin.");
        }
        DemandeModele demande = new DemandeModele();
        demande.setServiceId(service.getId());
        demande.setDemandeurId(medecin.getId());
        demande.setDemandeurNom(nomMedecin);
        demande.setIntitule(StructureDocument.limiter(titre, 150));
        demande.setDetails(details == null ? null : StructureDocument.limiter(details.trim(), 1000));
        demande.setStructureProposee(structureProposee);
        demandes.save(demande);

        if (service.getChefId() != null)
        {
            notifier.notifier(service.getChefId(), TypeNotification.MODELE_DEMANDE, "Modèle demandé",
                    nomMedecin + " demande un modèle « " + demande.getIntitule() + " » pour le service "
                            + service.getNom() + ".", "/medecin/modeles");
        }
        else
        {
            notifier.notifierAdministrateurs(TypeNotification.SERVICE_SANS_CHEF, "Service sans chef",
                    "Une demande de modèle attend dans le service " + service.getNom()
                            + ", qui n'a pas de chef de service. Désignez-en un.",
                    "/admin", "sans-chef-" + service.getId() + "-" + java.time.LocalDate.now());
        }
        return dto(demande, service.getNom());
    }

    @Transactional(readOnly = true)
    public List<DemandeDto> demandesDuChef(UserDetailsImpl chef)
    {
        Map<Long, String> noms = services.servicesDiriges(chef).stream()
                .collect(Collectors.toMap(ServiceHospitalier::getId, ServiceHospitalier::getNom));
        return demandes.findByServiceIdInOrderByDateCreationDesc(noms.keySet()).stream()
                .map(d -> dto(d, noms.get(d.getServiceId()))).toList();
    }

    @Transactional(readOnly = true)
    public JsonNode structureProposee(UserDetailsImpl chef, Long demandeId)
    {
        DemandeModele demande = demandes.findById(demandeId).orElseThrow(() -> new BusinessException("Demande introuvable."));
        exigerChef(chef, demande.getServiceId());
        return demande.getStructureProposee() == null ? null : structure.lire(demande.getStructureProposee());
    }

    @Transactional
    public DemandeDto traiter(UserDetailsImpl chef, Long demandeId, Long modeleId, String reponse, boolean refuser)
    {
        DemandeModele demande = demandes.findById(demandeId).orElseThrow(() -> new BusinessException("Demande introuvable."));
        exigerChef(chef, demande.getServiceId());
        demande.setStatut(refuser ? DemandeModele.Statut.REFUSEE : DemandeModele.Statut.TRAITEE);
        demande.setReponse(reponse == null ? null : StructureDocument.limiter(reponse.trim(), 500));
        demande.setDateTraitement(LocalDateTime.now());
        if (modeleId != null && !refuser)
        {
            ModeleDocument modele = modeleDuChef(chef, modeleId);
            demande.setModeleId(modele.getId());
        }
        String message = refuser
                ? "Votre demande « " + demande.getIntitule() + " » n'a pas été retenue."
                        + (demande.getReponse() == null ? "" : " " + demande.getReponse())
                : "Votre demande « " + demande.getIntitule() + " » a été traitée : le modèle est disponible.";
        notifier.notifier(demande.getDemandeurId(),
                refuser ? TypeNotification.MODELE_DEMANDE_REFUSEE : TypeNotification.MODELE_PUBLIE,
                refuser ? "Demande de modèle" : "Modèle disponible", message, "/medecin");
        return dto(demande, services.trouverService(demande.getServiceId()).map(ServiceHospitalier::getNom).orElse(""));
    }

    // ---------- Outils ----------

    private void appliquer(ModeleDocument modele, RequeteModele requete)
    {
        String nom = requete.nom() == null ? "" : requete.nom().trim();
        if (nom.isEmpty())
        {
            throw new BusinessException("Le nom du modèle est obligatoire.");
        }
        TypeDocument type;
        try
        {
            type = TypeDocument.valueOf(requete.type() == null ? "AUTRE" : requete.type());
        }
        catch (IllegalArgumentException e)
        {
            throw new BusinessException("Type de document inconnu.");
        }
        modele.setNom(StructureDocument.limiter(nom, 150));
        modele.setDescription(requete.description() == null ? null : StructureDocument.limiter(requete.description().trim(), 500));
        modele.setType(type);
        modele.setStructure(structure.normaliser(requete.structure()));
        modele.setDateModification(LocalDateTime.now());
    }

    private ModeleDocument modeleDuChef(UserDetailsImpl chef, Long id)
    {
        ModeleDocument modele = trouver(id);
        if (modele.isSysteme() || modele.getServiceId() == null)
        {
            throw new BusinessException("Le modèle intégré au logiciel ne se modifie pas.");
        }
        exigerChef(chef, modele.getServiceId());
        return modele;
    }

    private void exigerChef(UserDetailsImpl medecin, Long serviceId)
    {
        if (!services.estChef(medecin, serviceId))
        {
            throw new BusinessException("Seul le chef de ce service peut gérer ses modèles.");
        }
    }

    private Set<Long> idsDiriges(UserDetailsImpl chef)
    {
        return services.servicesDiriges(chef).stream().map(ServiceHospitalier::getId).collect(Collectors.toSet());
    }

    private ModeleDocument trouver(Long id)
    {
        return modeles.findById(id).orElseThrow(() -> new BusinessException("Modèle introuvable."));
    }

    private ModeleResume resume(ModeleDocument m, boolean favori, long utilisations)
    {
        return new ModeleResume(m.getId(), m.getNom(), m.getDescription(), m.getType().name(), m.getType().getLibelle(),
                m.getServiceId(), m.isSysteme(), m.getVersion(), m.getStatut().name(),
                structure.champs(m.getStructure()).size(), favori, utilisations,
                structure.lire(m.getStructure()).path("libre").asBoolean(false));
    }

    private static DemandeDto dto(DemandeModele d, String serviceNom)
    {
        return new DemandeDto(d.getId(), d.getServiceId(), serviceNom, d.getDemandeurNom(), d.getIntitule(), d.getDetails(),
                d.getStructureProposee() != null, d.getStatut().name(), d.getModeleId(), d.getReponse(),
                d.getDateCreation().toString());
    }
}
