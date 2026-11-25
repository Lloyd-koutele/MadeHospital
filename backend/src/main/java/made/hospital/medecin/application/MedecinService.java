package made.hospital.medecin.application;


import made.hospital.etablissement.application.EtablissementService;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.patient.application.PatientService;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import made.hospital.securite.application.UserDetailsImpl;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import made.hospital.patient.api.dto.PatientCreationDTO;
import made.hospital.medecin.api.dto.MedecinCreationDTO;
import made.hospital.dossiermedical.domaine.DossierMedical;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.patient.domaine.Patient;
import made.hospital.utilisateur.domaine.Role;
import made.hospital.utilisateur.domaine.User;
import made.hospital.commun.exception.BusinessException;
import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.patient.infra.PatientRepository;
import made.hospital.utilisateur.infra.UserRepository;

/**
 * Service pour la gestion des médecins
 */
@Service
public class MedecinService 
{

    @Autowired
    private MedecinRepository medecinRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PatientRepository patientRepository;
    
    @Autowired
    @org.springframework.context.annotation.Lazy
    private PatientService patientService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EtablissementService etablissementService;

    @Autowired
    private Notifier notifier;

    @Autowired
    private made.hospital.servicehospitalier.application.ServiceHospitalierService serviceHospitalierService;
    
    /**
     * Récupère le médecin connecté actuellement
     */
    public Optional<MedecinEntite> getMedecinConnecte() 
    {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl utilisateur)
        {
            return getMedecinConnecte(utilisateur);
        }
        if (principal instanceof UserDetails details)
        {
            return medecinRepository.findByEmail(details.getUsername());
        }
        return Optional.empty();
    }

    /**
     * Médecin correspondant à l'utilisateur authentifié (vide si ce n'est pas un médecin)
     */
    public Optional<MedecinEntite> getMedecinConnecte(UserDetailsImpl currentUser)
    {
        if (currentUser == null || !currentUser.estMedecin())
        {
            return Optional.empty();
        }
        return medecinRepository.findByEmail(currentUser.getEmail());
    }
    
    /**
     * Vérifie si l'utilisateur est un médecin
     */
    public boolean estMedecin(User user) 
    {
        return user != null && Role.MEDECIN.equals(user.getRoles());
    }
    
    /**
     * Récupère un médecin par son ID
     */
    public Optional<MedecinEntite> getMedecinById(Long id) 
    {
        return medecinRepository.findById(id);
    }
    
    /**
     * Récupère un médecin par son email
     */
    public Optional<MedecinEntite> getMedecinByEmail(String email) 
    {
        return medecinRepository.findByEmail(email);
    }
    
    /**
     * Récupère tous les médecins actifs
     */
    public List<MedecinEntite> getAllMedecinsActifs() 
    {
        return medecinRepository.findByActifTrue();
    }
    
    /**
     * Récupère les médecins par spécialité
     */
    public List<MedecinEntite> getMedecinsBySpecialite(String specialite) 
    {
        return medecinRepository.findBySpecialite(specialite);
    }
    
    /**
     * Crée ou met à jour un médecin
     */
    @Transactional
    public MedecinEntite saveMedecin(MedecinEntite medecin) 
    {
        return medecinRepository.save(medecin);
    }
    
    /**
     * Vérifie si un utilisateur est un médecin et retourne son entité si elle existe
     */
    public Optional<MedecinEntite> getMedecinFromUser(User user) 
    {
        if (!estMedecin(user)) {
            return Optional.empty();
        }
        
        // Vérifier si le médecin existe déjà
        return medecinRepository.findByEmail(user.getEmail());
    }

    /**
     * Crée un nouveau médecin
     *
     * @param dto les données du médecin à créer
     * @return le médecin créé
     * @throws BusinessException si les données sont invalides ou si l'email est déjà utilisé
     */
    @Transactional
    public MedecinEntite createMedecin(MedecinCreationDTO dto) 
    {
        etablissementService.exigerConfiguration();
        validateMedecinData(dto);
        
        // Vérifier si l'utilisateur existe déjà
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) 
        {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        
        // Créer et sauvegarder le médecin
        MedecinEntite medecin = new MedecinEntite(
            dto.getNom(),
            dto.getPrenom(),
            dto.getEmail(),
            passwordEncoder.encode(dto.getPassword()),
            dto.getTelephone(),
            dto.getSpecialite(),
            dto.getNumeroOrdre()
        );
        if (dto.getServiceIds() != null && !dto.getServiceIds().isEmpty())
        {
            serviceHospitalierService.definirServicesDuMedecin(medecin, dto.getServiceIds());
        }
        
        MedecinEntite enregistre = medecinRepository.save(medecin);
        notifier.notifier(enregistre.getId(), TypeNotification.COMPTE_CREE, "Bienvenue sur MadeHospital",
                "Votre compte médecin est prêt.", "/medecin");
        return enregistre;
    }
    
    private void validateMedecinData(MedecinCreationDTO dto) 
    {
        if (!StringUtils.hasText(dto.getNom())) {
            throw new BusinessException("Le nom est obligatoire");
        }
        if (!StringUtils.hasText(dto.getPrenom())) {
            throw new BusinessException("Le prénom est obligatoire");
        }
        if (!StringUtils.hasText(dto.getEmail())) {
            throw new BusinessException("L'email est obligatoire");
        }
        if (!StringUtils.hasText(dto.getPassword())) {
            throw new BusinessException("Le mot de passe est obligatoire");
        }
        if (dto.getPassword().length() < 6) {
            throw new BusinessException("Le mot de passe doit contenir au moins 6 caractères");
        }
        if (!StringUtils.hasText(dto.getTelephone())) {
            throw new BusinessException("Le téléphone est obligatoire");
        }
        if (!StringUtils.hasText(dto.getSpecialite())) {
            throw new BusinessException("La spécialité est obligatoire");
        }
        if (!StringUtils.hasText(dto.getNumeroOrdre())) {
            throw new BusinessException("Le numéro d'ordre est obligatoire");
        }
    }
    
    /**
     * Crée un nouveau patient à partir d'un DTO
     * 
     * @param dto Les données du patient à créer
     * @return Le patient créé
     * @throws BusinessException si les données sont invalides ou si le patient existe déjà
     */
    @Transactional
    public Patient createPatient(PatientCreationDTO dto) {
        // Validation des données
        etablissementService.exigerConfiguration();
        validatePatientData(dto);
        
        // Récupérer le médecin connecté
        Optional<MedecinEntite> medecinConnecteOpt = getMedecinConnecte();
        if (!medecinConnecteOpt.isPresent()) 
        {
            throw new BusinessException("Médecin non authentifié");
        }
        
        MedecinEntite medecinConnecte = medecinConnecteOpt.get();
        
        // Vérifier si le patient existe déjà (vérification centralisée au niveau du service)
        // La vérification redondante est supprimée ici car elle est déjà faite dans PatientService
        
        // Création du patient
        // Création du dossier médical
        DossierMedical dossierMedical = new DossierMedical(
            dto.getSexe(),
            dto.getGroupeSanguin(),
            dto.getContexte(),
            dto.getPoids(),
            dto.getTaille()
        );

        // Création du patient
        Patient patient = new Patient(
            dto.getNom(),
            dto.getPrenom(),
            dto.getEmail(),
            dossierMedical,
            dto.getDateNaissance(),
            dto.getTelephone()
        );
        
        // Hasher le mot de passe avant de l'enregistrer
        patient.setPassword(passwordEncoder.encode(dto.getPassword()));
        
        // Association du dossier médical au patient
        patient.setDossierMedical(dossierMedical);
        
        // Utiliser le PatientService pour créer le patient
        Patient enregistre = patientService.createPatient(patient, medecinConnecte);
        notifier.notifierParEmail(enregistre.getEmail(), TypeNotification.COMPTE_CREE, "Bienvenue sur MadeHospital",
                "Votre espace patient est prêt : rendez-vous, consultations et accès à votre dossier.", "/patient");
        return enregistre;
    }
    
    /**
     * Valide les données d'un patient
     */
    private void validatePatientData(PatientCreationDTO dto) {
        if (!StringUtils.hasText(dto.getNom())) {
            throw new BusinessException("Le nom est obligatoire");
        }
        if (!StringUtils.hasText(dto.getPrenom())) {
            throw new BusinessException("Le prénom est obligatoire");
        }
        if (!StringUtils.hasText(dto.getEmail())) {
            throw new BusinessException("L'email est obligatoire");
        }
        if (!StringUtils.hasText(dto.getPassword())) {
            throw new BusinessException("Le mot de passe est obligatoire");
        }
        if (dto.getPassword().length() < 6) {
            throw new BusinessException("Le mot de passe doit contenir au moins 6 caractères");
        }
        if (dto.getDateNaissance() == null) {
            throw new BusinessException("La date de naissance est obligatoire");
        }
        if (!StringUtils.hasText(dto.getTelephone())) {
            throw new BusinessException("Le téléphone est obligatoire");
        }
        if (!StringUtils.hasText(dto.getSexe())) {
            throw new BusinessException("Le sexe est obligatoire");
        }
        // Poids, taille, groupe sanguin et contexte (antécédents, allergies) sont facultatifs :
        // ils peuvent être inconnus à l'ouverture du dossier et complétés plus tard.
    }
    
}
