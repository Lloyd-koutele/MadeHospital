package made.hospital.utilisateur.application;

import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.commun.exception.BusinessException;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;
import made.hospital.utilisateur.api.dto.UtilisateurModificationDTO;
import made.hospital.utilisateur.domaine.AdminEntite;
import made.hospital.utilisateur.domaine.ChercheurEntite;
import made.hospital.utilisateur.domaine.User;
import made.hospital.utilisateur.infra.UserRepository;

/**
 * Consultation détaillée et modification des comptes par les administrateurs.
 */
@Service
public class GestionComptesService
{

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceHospitalierService serviceHospitalierService;
    private final Notifier notifier;

    public GestionComptesService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                                 ServiceHospitalierService serviceHospitalierService, Notifier notifier)
    {
        this.notifier = notifier;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.serviceHospitalierService = serviceHospitalierService;
    }

    /** Fiche d'un compte, avec les champs de son rôle (et ses services pour un médecin). */
    @Transactional(readOnly = true)
    public Map<String, Object> detail(Long id)
    {
        return versFiche(trouver(id));
    }

    @Transactional
    public Map<String, Object> modifier(Long id, UtilisateurModificationDTO dto)
    {
        User user = trouver(id);
        String email = dto.getEmail().trim();
        userRepository.findByEmail(email)
                .filter(autre -> !autre.getId().equals(id))
                .ifPresent(autre -> {
                    throw new BusinessException("Cet email est déjà utilisé par un autre compte");
                });

        user.setNom(dto.getNom().trim());
        user.setPrenom(dto.getPrenom().trim());
        user.setEmail(email);
        user.setTelephone(dto.getTelephone().trim());
        boolean motDePasseChange = false;
        if (dto.getPassword() != null && !dto.getPassword().isBlank())
        {
            if (dto.getPassword().length() < 6)
            {
                throw new BusinessException("Le mot de passe doit contenir au moins 6 caractères");
            }
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
            motDePasseChange = true;
        }

        if (user instanceof AdminEntite admin && dto.getDepartement() != null)
        {
            admin.setDepartement(dto.getDepartement().trim());
        }
        if (user instanceof ChercheurEntite chercheur && dto.getSpecialiteRecherche() != null)
        {
            chercheur.setSpecialiteRecherche(dto.getSpecialiteRecherche().trim());
        }
        if (user instanceof MedecinEntite medecin)
        {
            if (dto.getSpecialite() != null)
            {
                medecin.setSpecialite(dto.getSpecialite().trim());
            }
            if (dto.getNumeroOrdre() != null)
            {
                medecin.setNumeroOrdre(dto.getNumeroOrdre().trim());
            }
            if (dto.getServiceIds() != null)
            {
                serviceHospitalierService.definirServicesDuMedecin(medecin, dto.getServiceIds());
            }
        }
        User enregistre = userRepository.save(user);
        if (motDePasseChange)
        {
            notifier.notifier(enregistre.getId(), TypeNotification.MOT_DE_PASSE_REINITIALISE,
                    "Mot de passe modifié",
                    "Votre mot de passe a été modifié par un administrateur. Si vous n'en êtes pas à l'origine, contactez-le.",
                    null);
        }
        return versFiche(enregistre);
    }

    private User trouver(Long id)
    {
        return userRepository.findById(id).orElseThrow(() -> new BusinessException("Utilisateur introuvable"));
    }

    private static Map<String, Object> versFiche(User user)
    {
        Map<String, Object> fiche = new LinkedHashMap<>();
        fiche.put("id", user.getId());
        fiche.put("nom", user.getNom());
        fiche.put("prenom", user.getPrenom());
        fiche.put("email", user.getEmail());
        fiche.put("telephone", user.getTelephone());
        fiche.put("roles", user.getRoles().name());
        fiche.put("actif", user.isActif());
        if (user instanceof AdminEntite admin)
        {
            fiche.put("departement", admin.getDepartement());
        }
        if (user instanceof ChercheurEntite chercheur)
        {
            fiche.put("specialiteRecherche", chercheur.getSpecialiteRecherche());
        }
        if (user instanceof MedecinEntite medecin)
        {
            fiche.put("specialite", medecin.getSpecialite());
            fiche.put("numeroOrdre", medecin.getNumeroOrdre());
            fiche.put("serviceIds", medecin.getServices().stream().map(ServiceHospitalier::getId).sorted().toList());
        }
        return fiche;
    }
}
