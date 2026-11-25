package made.hospital.utilisateur.application;

import made.hospital.etablissement.application.EtablissementService;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import made.hospital.utilisateur.api.dto.ChercheurCreationDTO;
import made.hospital.utilisateur.domaine.ChercheurEntite;
import made.hospital.utilisateur.domaine.Role;
import made.hospital.commun.exception.BusinessException;
import made.hospital.utilisateur.infra.ChercheurRepository;
import made.hospital.utilisateur.infra.UserRepository;

@Service
public class ChercheurService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ChercheurRepository chercheurRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EtablissementService etablissementService;

    @Autowired
    private Notifier notifier;
    
    @Transactional
    public ChercheurEntite createChercheur(ChercheurCreationDTO dto) {
        etablissementService.exigerConfiguration();
        validateChercheurData(dto);
        
        // Vérifier si l'utilisateur existe déjà
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        
        // Créer et sauvegarder le chercheur
        ChercheurEntite chercheur = new ChercheurEntite(
            dto.getNom(),
            dto.getPrenom(),
            dto.getEmail(),
            passwordEncoder.encode(dto.getPassword()),
            dto.getTelephone(),
            dto.getSpecialiteRecherche()
        );
        
        ChercheurEntite enregistre = chercheurRepository.save(chercheur);
        notifier.notifier(enregistre.getId(), TypeNotification.COMPTE_CREE, "Bienvenue sur MadeHospital",
                "Votre compte chercheur est prêt.", "/chercheur");
        return enregistre;
    }
    
    private void validateChercheurData(ChercheurCreationDTO dto) {
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
        if (!StringUtils.hasText(dto.getTelephone())) {
            throw new BusinessException("Le téléphone est obligatoire");
        }
        if (!StringUtils.hasText(dto.getSpecialiteRecherche())) {
            throw new BusinessException("La spécialité de recherche est obligatoire");
        }
    }
}
