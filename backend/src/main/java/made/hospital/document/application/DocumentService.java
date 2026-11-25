package made.hospital.document.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import made.hospital.audit.infra.CleSignatureAudit;
import made.hospital.autorisation.application.AutorisationService;
import made.hospital.commun.exception.BusinessException;
import made.hospital.document.domaine.DocumentMedical;
import made.hospital.document.domaine.DocumentMedical.Statut;
import made.hospital.document.domaine.ModeleDocument;
import made.hospital.document.domaine.Sejour;
import made.hospital.document.domaine.TypeDocument;
import made.hospital.document.infra.DocumentMedicalRepository;
import made.hospital.document.infra.SejourRepository;
import made.hospital.dossiermedical.domaine.Consultation;
import made.hospital.imagerie.domaine.ImageMedicale;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.patient.domaine.Patient;
import made.hospital.patient.infra.PatientRepository;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

/**
 * Cycle de vie des documents médicaux : brouillon → validé (numéroté, haché, signé) → rectifié par une nouvelle version.
 *
 * Règles d'accès d'un médecin : accès au dossier du patient (autorisation) ; brouillons visibles par leur auteur
 * seulement ; documents validés visibles dans les services du médecin.
 */
@Service
public class DocumentService
{

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter JOUR_HEURE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final DocumentMedicalRepository documents;
    private final SejourRepository sejours;
    private final ModeleService modeles;
    private final StructureDocument structure;
    private final Numerotation numerotation;
    private final CleSignatureAudit cle;
    private final PatientRepository patients;
    private final MedecinRepository medecins;
    private final AutorisationService autorisations;
    private final ServiceHospitalierService services;
    private final Notifier notifier;

    public DocumentService(DocumentMedicalRepository documents, SejourRepository sejours, ModeleService modeles,
                           StructureDocument structure, Numerotation numerotation, CleSignatureAudit cle,
                           PatientRepository patients, MedecinRepository medecins, AutorisationService autorisations,
                           ServiceHospitalierService services, Notifier notifier)
    {
        this.documents = documents;
        this.sejours = sejours;
        this.modeles = modeles;
        this.structure = structure;
        this.numerotation = numerotation;
        this.cle = cle;
        this.patients = patients;
        this.medecins = medecins;
        this.autorisations = autorisations;
        this.services = services;
        this.notifier = notifier;
    }

    // ---------- Représentations ----------

    public record DocumentResume(UUID id, String numero, String type, String typeLibelle, String titre,
                                 String serviceNom, String auteurNom, String statut, String dateCreation,
                                 String dateValidation, UUID remplaceParId, UUID sejourId)
    {
        static DocumentResume depuis(DocumentMedical d)
        {
            return new DocumentResume(d.getId(), d.getNumero(), d.getType().name(), d.getType().getLibelle(), d.getTitre(),
                    d.getServiceNom(), d.getAuteurNom(), d.getStatut().name(), d.getDateCreation().toString(),
                    d.getDateValidation() == null ? null : d.getDateValidation().toString(), d.getRemplaceParId(),
                    d.getSejourId());
        }
    }

    public record DocumentDetail(DocumentResume resume, int patientId, Long serviceId, Long modeleId, Integer modeleVersion,
                                 JsonNode structure, JsonNode valeurs, String empreinte, UUID remplaceId,
                                 boolean modifiable, boolean rectifiable)
    {
    }

    public record Reference(String id, String libelle, String type, String date)
    {
    }

    public record References(List<Reference> documents, List<Reference> images, List<String> equipe)
    {
    }

    // ---------- Médecin ----------

    @Transactional(readOnly = true)
    public List<DocumentResume> lister(UserDetailsImpl medecin, int patientId)
    {
        exigerAccesPatient(medecin, patientId);
        Set<Long> mesServices = services.idsServicesDuMedecin(medecin);
        return documents.findByPatientIdOrderByDateCreationDesc(patientId).stream()
                .filter(d -> visible(medecin, mesServices, d))
                .map(DocumentResume::depuis)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentDetail lire(UserDetailsImpl medecin, UUID id)
    {
        DocumentMedical document = documentVisible(medecin, id);
        return detail(document, medecin);
    }

    @Transactional
    public DocumentDetail creer(UserDetailsImpl medecin, int patientId, Long modeleId, Long serviceId, UUID sejourId)
    {
        exigerAccesPatient(medecin, patientId);
        ServiceHospitalier service = services.serviceDeTravail(medecin, serviceId);
        ModeleDocument modele = modeles.utilisable(modeleId, service.getId());

        DocumentMedical document = new DocumentMedical();
        document.setType(modele.getType());
        document.setTitre(modele.getNom());
        document.setPatientId(patientId);
        document.setServiceId(service.getId());
        document.setServiceNom(service.getNom());
        document.setAuteurId(medecin.getId());
        document.setAuteurNom(nomMedecin(medecin.getId()));
        document.setModeleId(modele.getId());
        document.setModeleVersion(modele.getVersion());
        document.setStructure(modele.getStructure());
        document.setSejourId(sejourPour(patientId, modele, sejourId));
        ObjectNode valeurs = structure.valeursInitiales(modele.getStructure());
        completerAuto(document, valeurs);
        document.setValeurs(structure.ecrire(valeurs));
        return detail(documents.save(document), medecin);
    }

    /** Enregistre la saisie d'un brouillon. Pour un document libre, la structure (sections) peut aussi changer. */
    @Transactional
    public DocumentDetail modifier(UserDetailsImpl medecin, UUID id, String titre, JsonNode valeurs, JsonNode nouvelleStructure)
    {
        DocumentMedical document = brouillonDeLAuteur(medecin, id);
        if (nouvelleStructure != null && structure.lire(document.getStructure()).path("libre").asBoolean(false))
        {
            document.setStructure(structure.structureLibre(nouvelleStructure));
        }
        if (titre != null && !titre.isBlank())
        {
            document.setTitre(StructureDocument.limiter(titre.trim(), 150));
        }
        ObjectNode propres = structure.nettoyer(document.getStructure(), valeurs);
        completerAuto(document, propres);
        document.setValeurs(structure.ecrire(propres));
        document.setDateModification(LocalDateTime.now());
        return detail(document, medecin);
    }

    @Transactional
    public DocumentDetail valider(UserDetailsImpl medecin, UUID id)
    {
        DocumentMedical document = brouillonDeLAuteur(medecin, id);
        ObjectNode valeurs = (ObjectNode) structure.lire(document.getValeurs());
        completerAuto(document, valeurs);
        List<String> manquants = structure.manquants(document.getStructure(), valeurs);
        if (!manquants.isEmpty())
        {
            throw new BusinessException("Champs obligatoires à remplir : " + String.join(", ", manquants) + ".");
        }
        document.setValeurs(structure.ecrire(valeurs));
        document.setNumero(numerotation.prochain(document.getType().getPrefixe()));
        document.setDateValidation(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
        document.setEmpreinte(empreinte(document));
        document.setSignature(cle.signer(document.getEmpreinte()));
        document.setStatut(Statut.VALIDE);

        if (document.getRemplaceId() != null)
        {
            documents.findById(document.getRemplaceId()).ifPresent(ancien ->
            {
                ancien.setStatut(Statut.RECTIFIE);
                ancien.setRemplaceParId(document.getId());
            });
        }
        patients.findById(document.getPatientId().intValue()).ifPresent(p ->
                notifier.notifierParEmail(p.getEmail(), TypeNotification.DOCUMENT_DISPONIBLE, "Nouveau document",
                        document.getType().getLibelle() + " disponible dans votre espace (" + document.getNumero() + ").",
                        "/patient/dossier?onglet=documents"));
        return detail(document, medecin);
    }

    @Transactional
    public void supprimerBrouillon(UserDetailsImpl medecin, UUID id)
    {
        documents.delete(brouillonDeLAuteur(medecin, id));
    }

    /** Crée une nouvelle version (brouillon) d'un document validé ; l'ancien sera marqué rectifié à sa validation. */
    @Transactional
    public DocumentDetail rectifier(UserDetailsImpl medecin, UUID id)
    {
        DocumentMedical ancien = documentVisible(medecin, id);
        if (ancien.getStatut() != Statut.VALIDE)
        {
            throw new BusinessException("Seul un document validé peut être rectifié.");
        }
        if (!medecin.getId().equals(ancien.getAuteurId()) && !services.estChef(medecin, ancien.getServiceId()))
        {
            throw new BusinessException("Seul l'auteur ou le chef du service peut rectifier ce document.");
        }
        ServiceHospitalier service = services.serviceDeTravail(medecin, ancien.getServiceId());
        DocumentMedical copie = new DocumentMedical();
        copie.setType(ancien.getType());
        copie.setTitre(ancien.getTitre());
        copie.setPatientId(ancien.getPatientId());
        copie.setServiceId(service.getId());
        copie.setServiceNom(service.getNom());
        copie.setAuteurId(medecin.getId());
        copie.setAuteurNom(nomMedecin(medecin.getId()));
        copie.setModeleId(ancien.getModeleId());
        copie.setModeleVersion(ancien.getModeleVersion());
        copie.setStructure(ancien.getStructure());
        copie.setValeurs(ancien.getValeurs());
        copie.setSejourId(ancien.getSejourId());
        copie.setRemplaceId(ancien.getId());
        return detail(documents.save(copie), medecin);
    }

    /** Propose au chef de service la structure d'un document libre (titres de sections, sans aucune donnée patient). */
    @Transactional
    public ModeleService.DemandeDto proposerCommeModele(UserDetailsImpl medecin, UUID id, String intitule, String details)
    {
        DocumentMedical document = documentVisible(medecin, id);
        if (!medecin.getId().equals(document.getAuteurId()))
        {
            throw new BusinessException("Seul l'auteur peut proposer ce document comme modèle.");
        }
        return modeles.demander(medecin, nomMedecin(medecin.getId()), document.getServiceId(), intitule, details,
                structure.structureSansDonnees(document.getStructure()));
    }

    /** Éléments que le médecin peut lier : documents validés du patient, images, médecins de son service. */
    @Transactional(readOnly = true)
    public References references(UserDetailsImpl medecin, int patientId, Long serviceId)
    {
        exigerAccesPatient(medecin, patientId);
        Set<Long> mesServices = services.idsServicesDuMedecin(medecin);
        List<Reference> docs = documents.findByPatientIdAndStatutInOrderByDateCreationDesc(patientId,
                        List.of(Statut.VALIDE, Statut.IMPORTE)).stream()
                .filter(d -> visible(medecin, mesServices, d))
                .map(d -> new Reference(d.getId().toString(), libelleDocument(d), d.getType().name(),
                        (d.getDateValidation() == null ? d.getDateCreation() : d.getDateValidation()).toString()))
                .toList();
        List<Reference> images = new ArrayList<>();
        for (ImageMedicale image : imagesDuPatient(patientId))
        {
            images.add(new Reference(image.getId().toString(), libelleImage(image), image.getTypeImage(),
                    image.getDate() == null ? null : image.getDate().toString()));
        }
        List<String> equipe = new ArrayList<>();
        Long service = serviceId != null ? serviceId : null;
        if (service != null && mesServices.contains(service))
        {
            for (Long id : services.medecinsDuService(service))
            {
                if (!id.equals(medecin.getId()))
                {
                    equipe.add(nomMedecin(id));
                }
            }
        }
        return new References(docs, images, equipe);
    }

    @Transactional(readOnly = true)
    public DocumentMedical documentPourPdf(UserDetailsImpl medecin, UUID id)
    {
        return documentVisible(medecin, id);
    }

    // ---------- Patient ----------

    @Transactional(readOnly = true)
    public List<DocumentResume> mesDocuments(UserDetailsImpl patient)
    {
        Patient p = patientConnecte(patient);
        return documents.findByPatientIdAndStatutInOrderByDateCreationDesc(p.getId(),
                        List.of(Statut.VALIDE, Statut.RECTIFIE, Statut.IMPORTE)).stream()
                .map(DocumentResume::depuis).toList();
    }

    @Transactional(readOnly = true)
    public DocumentMedical monDocument(UserDetailsImpl patient, UUID id)
    {
        Patient p = patientConnecte(patient);
        DocumentMedical document = documents.findById(id).orElseThrow(() -> new BusinessException("Document introuvable."));
        if (document.getPatientId() != p.getId() || document.getStatut() == Statut.BROUILLON)
        {
            throw new BusinessException("Document introuvable.");
        }
        return document;
    }

    // ---------- Vérification publique ----------

    public record Verification(String numero, String type, String service, String dateValidation, String statut,
                               boolean authentique, String remplacePar)
    {
    }

    @Transactional(readOnly = true)
    public Verification verifier(String numero, String extraitEmpreinte)
    {
        DocumentMedical d = documents.findByNumero(numero).orElse(null);
        if (d == null || d.getEmpreinte() == null)
        {
            return new Verification(numero, null, null, null, "INCONNU", false, null);
        }
        boolean integre = d.getEmpreinte().equals(empreinte(d)) && cle.verifier(d.getEmpreinte(), d.getSignature());
        boolean correspond = extraitEmpreinte == null || extraitEmpreinte.isBlank()
                || d.getEmpreinte().startsWith(extraitEmpreinte.trim().toLowerCase());
        String remplacePar = d.getRemplaceParId() == null ? null
                : documents.findById(d.getRemplaceParId()).map(DocumentMedical::getNumero).orElse(null);
        return new Verification(d.getNumero(), d.getType().getLibelle(), d.getServiceNom(),
                d.getDateValidation().format(JOUR_HEURE), d.getStatut().name(), integre && correspond, remplacePar);
    }

    // ---------- Données calculées ----------

    /** Valeurs remplies par le serveur (patient, médecin, service, date, séjour) et libellés des éléments liés. */
    void completerAuto(DocumentMedical document, ObjectNode valeurs)
    {
        Map<String, String> auto = new HashMap<>();
        Set<String> sources = structure.sourcesAuto(document.getStructure());
        Patient patient = patients.findById(document.getPatientId().intValue()).orElse(null);
        if (patient != null)
        {
            auto.put("@patient.nom", patient.getPrenom() + " " + patient.getNom());
            auto.put("@patient.naissance", patient.getDateNaissance() == null ? ""
                    : new SimpleDateFormat("dd/MM/yyyy").format(patient.getDateNaissance()));
            auto.put("@patient.sexe", patient.getDossierMedical() == null || patient.getDossierMedical().getSexe() == null
                    ? "" : patient.getDossierMedical().getSexe());
            auto.put("@patient.dossier", String.format("P-%06d", patient.getId()));
        }
        auto.put("@medecin.nom", "Dr " + document.getAuteurNom().replaceFirst("^Dr ", ""));
        auto.put("@medecin.specialite", medecins.findById(document.getAuteurId()).map(MedecinEntite::getSpecialite).orElse(""));
        auto.put("@service.nom", document.getServiceNom() == null ? "" : document.getServiceNom());
        auto.put("@date", (document.getDateValidation() == null ? LocalDate.now() : document.getDateValidation().toLocalDate()).format(JOUR));
        if (document.getSejourId() != null)
        {
            sejours.findById(document.getSejourId()).ifPresent(s ->
            {
                auto.put("@sejour.numero", s.getNumero() == null ? "" : s.getNumero());
                auto.put("@sejour.entree", s.getDateEntree().format(JOUR_HEURE));
                auto.put("@sejour.sortie", s.getDateSortie() == null ? "En cours" : s.getDateSortie().format(JOUR_HEURE));
                auto.put("@sejour.lit", s.getLit() == null ? "" : s.getLit());
                auto.put("@sejour.motif", s.getMotif() == null ? "" : s.getMotif());
            });
        }
        auto.keySet().removeIf(k -> !sources.contains(k.substring(1)));

        // Libellés des documents et images liés (figés avec le document)
        for (JsonNode champ : structure.champs(document.getStructure()))
        {
            String cleChamp = champ.path("cle").asText();
            JsonNode v = valeurs.get(cleChamp);
            if (v == null)
            {
                continue;
            }
            if ("DOCUMENT_LIE".equals(champ.path("champ").asText()))
            {
                auto.put(StructureDocument.PREFIXE_AFFICHAGE + cleChamp, libelleDocumentLie(document.getPatientId(), v.asText()));
            }
            else if ("IMAGES".equals(champ.path("champ").asText()))
            {
                auto.put(StructureDocument.PREFIXE_AFFICHAGE + cleChamp, libellesImages(document.getPatientId(), v));
            }
        }
        structure.fusionnerAuto(valeurs, auto);
    }

    private String libelleDocumentLie(int patientId, String id)
    {
        try
        {
            return documents.findById(UUID.fromString(id))
                    .filter(d -> d.getPatientId() == patientId && d.getStatut() != Statut.BROUILLON)
                    .map(this::libelleDocument)
                    .orElseThrow(() -> new BusinessException("Le document lié n'appartient pas à ce patient."));
        }
        catch (IllegalArgumentException e)
        {
            throw new BusinessException("Document lié invalide.");
        }
    }

    private String libellesImages(int patientId, JsonNode ids)
    {
        Map<String, ImageMedicale> parId = new HashMap<>();
        for (ImageMedicale image : imagesDuPatient(patientId))
        {
            parId.put(image.getId().toString(), image);
        }
        List<String> libelles = new ArrayList<>();
        for (JsonNode id : ids)
        {
            ImageMedicale image = parId.get(id.asText());
            if (image == null)
            {
                throw new BusinessException("Une image sélectionnée n'appartient pas à ce patient.");
            }
            libelles.add(libelleImage(image));
        }
        return String.join(" ; ", libelles);
    }

    private List<ImageMedicale> imagesDuPatient(int patientId)
    {
        List<ImageMedicale> images = new ArrayList<>();
        patients.findById(patientId).ifPresent(p ->
        {
            if (p.getDossierMedical() != null)
            {
                for (Consultation c : p.getDossierMedical().getConsultation())
                {
                    images.addAll(c.getImages());
                }
            }
        });
        return images;
    }

    private String libelleDocument(DocumentMedical d)
    {
        String date = (d.getDateValidation() == null ? d.getDateCreation() : d.getDateValidation()).toLocalDate().format(JOUR);
        return (d.getNumero() == null ? d.getType().getLibelle() : d.getNumero()) + " · " + d.getTitre() + " · " + date;
    }

    private static String libelleImage(ImageMedicale image)
    {
        String date = image.getDate() == null ? "" : " · " + image.getDate().toLocalDate().format(JOUR);
        String description = image.getDescription() == null || image.getDescription().isBlank() ? "" : " — " + image.getDescription();
        return (image.getTypeImage() == null ? "Image" : image.getTypeImage()) + description + date;
    }

    private UUID sejourPour(int patientId, ModeleDocument modele, UUID sejourId)
    {
        if (sejourId != null)
        {
            Sejour sejour = sejours.findById(sejourId).orElseThrow(() -> new BusinessException("Séjour introuvable."));
            if (sejour.getPatientId() != patientId)
            {
                throw new BusinessException("Ce séjour n'appartient pas au patient.");
            }
            return sejour.getId();
        }
        if (modele.getType() == TypeDocument.COMPTE_RENDU_HOSPITALISATION)
        {
            return sejours.findByPatientIdOrderByDateEntreeDesc(patientId).stream().findFirst().map(Sejour::getId)
                    .orElseThrow(() -> new BusinessException("Ce patient n'a aucun séjour : déclarez d'abord son admission."));
        }
        return null;
    }

    /** Empreinte SHA-256 du contenu signé : toute modification ultérieure la rend invalide. */
    private static String empreinte(DocumentMedical d)
    {
        String contenu = String.join("|", d.getNumero(), d.getType().name(), String.valueOf(d.getPatientId()),
                String.valueOf(d.getServiceId()), String.valueOf(d.getAuteurId()), d.getDateValidation().toString(),
                d.getStructure(), d.getValeurs());
        try
        {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenu.getBytes(StandardCharsets.UTF_8)));
        }
        catch (NoSuchAlgorithmException e)
        {
            throw new IllegalStateException(e);
        }
    }

    // ---------- Contrôles d'accès ----------

    private void exigerAccesPatient(UserDetailsImpl medecin, int patientId)
    {
        if (!autorisations.verifierAccesMedecin(medecin, patientId))
        {
            throw new AccesDocumentRefuse("Vous n'avez pas accès au dossier de ce patient.");
        }
    }

    private boolean visible(UserDetailsImpl medecin, Set<Long> mesServices, DocumentMedical d)
    {
        if (medecin.getId().equals(d.getAuteurId()))
        {
            return true;
        }
        return d.getStatut() != Statut.BROUILLON && (d.getServiceId() == null || mesServices.contains(d.getServiceId()));
    }

    private DocumentMedical documentVisible(UserDetailsImpl medecin, UUID id)
    {
        DocumentMedical document = documents.findById(id).orElseThrow(() -> new BusinessException("Document introuvable."));
        exigerAccesPatient(medecin, document.getPatientId());
        if (!visible(medecin, services.idsServicesDuMedecin(medecin), document))
        {
            throw new AccesDocumentRefuse("Ce document appartient à un service auquel vous n'êtes pas affecté.");
        }
        return document;
    }

    private DocumentMedical brouillonDeLAuteur(UserDetailsImpl medecin, UUID id)
    {
        DocumentMedical document = documentVisible(medecin, id);
        if (document.getStatut() != Statut.BROUILLON)
        {
            throw new BusinessException("Ce document est validé : il ne se modifie plus. Utilisez « Rectifier ».");
        }
        if (!medecin.getId().equals(document.getAuteurId()))
        {
            throw new AccesDocumentRefuse("Seul l'auteur peut modifier ce brouillon.");
        }
        return document;
    }

    public Patient patientConnecte(UserDetailsImpl patient)
    {
        return patients.findByEmail(patient.getEmail()).orElseThrow(() -> new BusinessException("Patient introuvable."));
    }

    public String nomMedecinPublic(Long id)
    {
        return nomMedecin(id);
    }

    String nomMedecin(Long id)
    {
        return medecins.findById(id).map(m -> "Dr " + m.getPrenom() + " " + m.getNom()).orElse("Médecin");
    }

    private DocumentDetail detail(DocumentMedical d, UserDetailsImpl medecin)
    {
        boolean auteur = medecin.getId().equals(d.getAuteurId());
        boolean rectifiable = d.getStatut() == Statut.VALIDE && (auteur || services.estChef(medecin, d.getServiceId()));
        return new DocumentDetail(DocumentResume.depuis(d), d.getPatientId(), d.getServiceId(), d.getModeleId(),
                d.getModeleVersion(), structure.lire(d.getStructure()), structure.lire(d.getValeurs()), d.getEmpreinte(),
                d.getRemplaceId(), auteur && d.getStatut() == Statut.BROUILLON, rectifiable);
    }

    /** Refus d'accès (403) propre aux documents. */
    public static class AccesDocumentRefuse extends RuntimeException
    {
        public AccesDocumentRefuse(String message)
        {
            super(message);
        }
    }
}
