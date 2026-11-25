package made.hospital.servicehospitalier.application;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.dossiermedical.domaine.Consultation;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.api.dto.ServiceHospitalierDto;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;
import made.hospital.servicehospitalier.infra.ServiceHospitalierRepository;

/**
 * Gestion des services de l'hôpital et des règles d'accès qui en découlent :
 * un médecin ne consulte que les consultations de ses services et ne crée que dans ses services actifs.
 */
@Service
public class ServiceHospitalierService
{

    private final ServiceHospitalierRepository serviceRepository;
    private final MedecinRepository medecinRepository;
    private final Notifier notifier;

    public ServiceHospitalierService(ServiceHospitalierRepository serviceRepository, MedecinRepository medecinRepository,
                                     Notifier notifier)
    {
        this.notifier = notifier;
        this.serviceRepository = serviceRepository;
        this.medecinRepository = medecinRepository;
    }

    // ---------- Administration ----------

    @Transactional(readOnly = true)
    public List<ServiceHospitalierDto> lister()
    {
        return serviceRepository.findAllByOrderByNomAsc().stream()
                .map(s -> ServiceHospitalierDto.depuis(s, medecinIds(s.getId())))
                .toList();
    }

    @Transactional
    public ServiceHospitalierDto creer(ServiceHospitalierDto.Requete requete)
    {
        String nom = nettoyer(requete.nom());
        if (serviceRepository.existsByNomIgnoreCase(nom))
        {
            throw new IllegalArgumentException("Un service porte déjà ce nom.");
        }
        String code = genererCode(nom);
        ServiceHospitalier service = serviceRepository.save(new ServiceHospitalier(nom, code, nettoyerOptionnel(requete.description())));
        return ServiceHospitalierDto.depuis(service, List.of());
    }

    @Transactional
    public ServiceHospitalierDto modifier(Long id, ServiceHospitalierDto.Requete requete)
    {
        ServiceHospitalier service = trouver(id);
        String nom = nettoyer(requete.nom());
        if (serviceRepository.existsByNomIgnoreCaseAndIdNot(nom, id))
        {
            throw new IllegalArgumentException("Un service porte déjà ce nom.");
        }
        // Le code, généré à la création, ne change pas : il identifie le service dans l'historique
        service.setNom(nom);
        service.setDescription(nettoyerOptionnel(requete.description()));
        return ServiceHospitalierDto.depuis(service, medecinIds(id));
    }

    @Transactional
    public ServiceHospitalierDto changerStatut(Long id, boolean actif)
    {
        ServiceHospitalier service = trouver(id);
        boolean desactivation = service.isActif() && !actif;
        service.setActif(actif);
        int affectes = medecinRepository.findByServices_Id(id).size();
        if (desactivation && affectes > 0)
        {
            notifier.notifierAdministrateurs(TypeNotification.SERVICE_DESACTIVE_AVEC_MEDECINS,
                    "Service désactivé avec des médecins",
                    "Le service " + service.getNom() + " est désactivé alors que " + affectes
                            + " médecin(s) y sont encore affectés.",
                    "/admin", null);
        }
        return ServiceHospitalierDto.depuis(service, medecinIds(id));
    }

    /** Remplace la liste des médecins affectés au service. */
    @Transactional
    public ServiceHospitalierDto affecterMedecins(Long id, List<Long> medecinIds)
    {
        ServiceHospitalier service = trouver(id);
        Set<Long> voulus = medecinIds == null ? Set.of() : new HashSet<>(medecinIds);

        for (MedecinEntite medecin : medecinRepository.findByServices_Id(id))
        {
            if (!voulus.contains(medecin.getId()) && medecin.getServices().remove(service))
            {
                retire(medecin, service);
            }
        }
        List<MedecinEntite> medecins = medecinRepository.findAllById(voulus);
        if (medecins.size() != voulus.size())
        {
            throw new IllegalArgumentException("Un ou plusieurs médecins sont introuvables.");
        }
        for (MedecinEntite medecin : medecins)
        {
            if (medecin.getServices().add(service))
            {
                affecte(medecin, service);
            }
        }
        return ServiceHospitalierDto.depuis(service, medecinIds(id));
    }

    /**
     * Remplace les services d'un médecin (création ou modification du compte par un administrateur).
     * L'appelant enregistre ensuite le médecin.
     */
    @Transactional
    public void definirServicesDuMedecin(MedecinEntite medecin, List<Long> serviceIds)
    {
        Set<Long> ids = serviceIds == null ? Set.of() : new HashSet<>(serviceIds);
        List<ServiceHospitalier> services = serviceRepository.findAllById(ids);
        if (services.size() != ids.size())
        {
            throw new IllegalArgumentException("Un ou plusieurs services sont introuvables.");
        }
        Set<ServiceHospitalier> avant = new HashSet<>(medecin.getServices());
        medecin.getServices().clear();
        medecin.getServices().addAll(services);
        for (ServiceHospitalier service : services)
        {
            if (!avant.contains(service))
            {
                affecte(medecin, service);
            }
        }
        for (ServiceHospitalier service : avant)
        {
            if (!medecin.getServices().contains(service))
            {
                retire(medecin, service);
            }
        }
    }

    /** Désigne (ou retire, avec null) le chef d'un service : il doit être un médecin du service. */
    @Transactional
    public ServiceHospitalierDto designerChef(Long id, Long medecinId)
    {
        ServiceHospitalier service = trouver(id);
        Long ancien = service.getChefId();
        if (medecinId == null)
        {
            service.setChefId(null);
        }
        else
        {
            MedecinEntite medecin = medecinRepository.findById(medecinId)
                    .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable."));
            if (medecin.getServices().stream().noneMatch(s -> s.getId().equals(id)))
            {
                throw new IllegalArgumentException("Le chef de service doit être un médecin affecté à ce service.");
            }
            service.setChefId(medecinId);
            if (!medecinId.equals(ancien))
            {
                notifier.notifier(medecinId, TypeNotification.CHEF_DESIGNE, "Chef de service",
                        "Vous êtes désigné(e) chef du service " + service.getNom()
                                + ". Vous pouvez gérer ses modèles de documents.", "/medecin/modeles");
            }
        }
        if (ancien != null && !ancien.equals(medecinId))
        {
            notifier.notifier(ancien, TypeNotification.SERVICE_RETIRE, "Fin de fonction de chef",
                    "Vous n'êtes plus chef du service " + service.getNom() + ".", "/medecin");
        }
        return ServiceHospitalierDto.depuis(service, medecinIds(id));
    }

    /** Un chef qui n'appartient plus au service perd sa fonction. */
    private void verifierChef(ServiceHospitalier service, MedecinEntite medecin)
    {
        if (medecin.getId() != null && medecin.getId().equals(service.getChefId()))
        {
            service.setChefId(null);
        }
    }

    /** Identifiants des médecins affectés à un service. */
    @Transactional(readOnly = true)
    public List<Long> medecinsDuService(Long serviceId)
    {
        return serviceId == null ? List.of() : medecinIds(serviceId);
    }

    /** Services dirigés par le médecin connecté. */
    @Transactional(readOnly = true)
    public List<ServiceHospitalier> servicesDiriges(UserDetailsImpl currentUser)
    {
        if (currentUser == null || !currentUser.estMedecin())
        {
            return List.of();
        }
        return serviceRepository.findByChefId(currentUser.getId());
    }

    public boolean estChef(UserDetailsImpl currentUser, Long serviceId)
    {
        return serviceId != null && servicesDiriges(currentUser).stream().anyMatch(s -> s.getId().equals(serviceId));
    }

    @Transactional(readOnly = true)
    public Optional<ServiceHospitalier> trouverService(Long id)
    {
        return id == null ? Optional.empty() : serviceRepository.findById(id);
    }

    private void affecte(MedecinEntite medecin, ServiceHospitalier service)
    {
        notifier.notifier(medecin.getId(), TypeNotification.SERVICE_AFFECTE, "Nouveau service",
                "Vous êtes affecté(e) au service " + service.getNom() + ".", "/medecin");
    }

    private void retire(MedecinEntite medecin, ServiceHospitalier service)
    {
        verifierChef(service, medecin);
        notifier.notifier(medecin.getId(), TypeNotification.SERVICE_RETIRE, "Service retiré",
                "Vous n'êtes plus affecté(e) au service " + service.getNom() + ".", "/medecin");
    }

    // ---------- Règles d'accès des médecins ----------

    /** Services du médecin connecté (actifs et désactivés), triés par nom. */
    @Transactional(readOnly = true)
    public List<ServiceHospitalier> servicesDuMedecin(UserDetailsImpl currentUser)
    {
        if (currentUser == null || !currentUser.estMedecin())
        {
            return List.of();
        }
        return medecinRepository.findByEmail(currentUser.getEmail())
                .map(m -> m.getServices().stream()
                        .sorted((a, b) -> a.getNom().compareToIgnoreCase(b.getNom()))
                        .toList())
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public Set<Long> idsServicesDuMedecin(UserDetailsImpl currentUser)
    {
        return servicesDuMedecin(currentUser).stream().map(ServiceHospitalier::getId).collect(Collectors.toSet());
    }

    /**
     * Un médecin ne voit une consultation que si elle appartient à l'un de ses services.
     * Les consultations antérieures à la mise en place des services (sans service) restent lisibles.
     */
    public boolean peutConsulter(Set<Long> servicesDuMedecin, Consultation consultation)
    {
        return consultation.getService() == null || servicesDuMedecin.contains(consultation.getService().getId());
    }

    /**
     * Service dans lequel le médecin crée une consultation ou un rendez-vous.
     * Sans serviceId, son unique service actif est retenu ; sinon le service doit être l'un des siens et actif.
     */
    @Transactional(readOnly = true)
    public ServiceHospitalier serviceDeTravail(UserDetailsImpl currentUser, Long serviceId)
    {
        List<ServiceHospitalier> actifs = servicesDuMedecin(currentUser).stream().filter(ServiceHospitalier::isActif).toList();
        if (actifs.isEmpty())
        {
            throw new ServiceRefuseException("Aucun service actif ne vous est affecté. Contactez l'administrateur.");
        }
        if (serviceId == null)
        {
            if (actifs.size() == 1)
            {
                return actifs.get(0);
            }
            throw new ServiceRefuseException("Choisissez le service dans lequel vous travaillez.");
        }
        Optional<ServiceHospitalier> service = actifs.stream().filter(s -> s.getId().equals(serviceId)).findFirst();
        return service.orElseThrow(() -> new ServiceRefuseException("Vous n'êtes pas affecté à ce service."));
    }

    // ---------- Outils ----------

    private ServiceHospitalier trouver(Long id)
    {
        return serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service introuvable."));
    }

    private List<Long> medecinIds(Long serviceId)
    {
        return medecinRepository.findByServices_Id(serviceId).stream().map(MedecinEntite::getId).sorted().toList();
    }

    private static String nettoyer(String valeur)
    {
        if (valeur == null || valeur.isBlank())
        {
            throw new IllegalArgumentException("Le nom du service est obligatoire.");
        }
        return valeur.trim();
    }

    /**
     * Code court généré à partir du nom : initiales pour un nom en plusieurs mots
     * (« Médecine interne » → MI), sinon les trois premières lettres (« Imagerie » → IMA).
     * Un numéro est ajouté si le code existe déjà (IMA2, IMA3...).
     */
    String genererCode(String nom)
    {
        String sansAccents = java.text.Normalizer.normalize(nom, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase();
        List<String> mots = java.util.Arrays.stream(sansAccents.split("[^A-Z0-9]+"))
                .filter(m -> !m.isBlank())
                .filter(m -> !Set.of("DE", "DU", "DES", "LA", "LE", "LES", "ET", "D", "L").contains(m))
                .toList();
        String base;
        if (mots.isEmpty())
        {
            base = "SRV";
        }
        else if (mots.size() == 1)
        {
            base = mots.get(0).substring(0, Math.min(3, mots.get(0).length()));
        }
        else
        {
            base = mots.stream().limit(4).map(m -> m.substring(0, 1)).collect(Collectors.joining());
        }
        String code = base;
        int suffixe = 2;
        while (serviceRepository.existsByCodeIgnoreCase(code))
        {
            code = base + suffixe++;
        }
        return code;
    }

    private static String nettoyerOptionnel(String valeur)
    {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
