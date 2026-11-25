package made.hospital.utilisateur.application;

import made.hospital.etablissement.application.EtablissementService;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import made.hospital.utilisateur.api.dto.AdminCreationDTO;
import made.hospital.utilisateur.domaine.AdminEntite;
import made.hospital.commun.exception.BusinessException;
import made.hospital.utilisateur.infra.AdminRepository;
import made.hospital.utilisateur.infra.UserRepository;

/**
 * Service responsable de la gestion des administrateurs
 */
@Service
public class AdminService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AdminRepository adminRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EtablissementService etablissementService;

    @Autowired
    private Notifier notifier;
    
    /**
     * Crée un nouvel administrateur
     * 
     * @param dto les données de l'administrateur à créer
     * @return l'administrateur créé
     * @throws BusinessException si les données sont invalides ou si l'email est déjà utilisé
     */
    @Transactional
    public AdminEntite createAdmin(AdminCreationDTO dto) {
        etablissementService.exigerConfiguration();
        validateAdminData(dto);
        
        // Vérifier si l'utilisateur existe déjà
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        
        // Créer et sauvegarder l'administrateur
        AdminEntite admin = new AdminEntite(
            dto.getNom(),
            dto.getPrenom(),
            dto.getEmail(),
            passwordEncoder.encode(dto.getPassword()),
            dto.getTelephone(),
            dto.getDepartement()
        );
        
        AdminEntite enregistre = adminRepository.save(admin);
        notifier.notifier(enregistre.getId(), TypeNotification.COMPTE_CREE, "Bienvenue sur MadeHospital",
                "Votre compte administrateur est prêt.", "/admin");
        return enregistre;
    }
    
    private void validateAdminData(AdminCreationDTO dto) {
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
        if (dto.getPassword().length() < 5) {
            throw new BusinessException("Le mot de passe doit contenir au moins 5 caractères");
        }
        if (!StringUtils.hasText(dto.getTelephone())) {
            throw new BusinessException("Le téléphone est obligatoire");
        }
        if (!StringUtils.hasText(dto.getDepartement())) {
            throw new BusinessException("Le département est obligatoire");
        }
    }
}
