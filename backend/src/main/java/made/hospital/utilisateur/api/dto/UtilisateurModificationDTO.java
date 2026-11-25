package made.hospital.utilisateur.api.dto;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Modification d'un compte par un administrateur. Le rôle ne change pas.
 * Les champs propres à un rôle sont ignorés pour les autres rôles.
 */
@Data
public class UtilisateurModificationDTO
{

    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, max = 100, message = "Le nom doit contenir entre 2 et 100 caractères")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(min = 2, max = 100, message = "Le prénom doit contenir entre 2 et 100 caractères")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email n'est pas valide")
    private String email;

    @NotBlank(message = "Le numéro de téléphone est obligatoire")
    @Size(min = 8, max = 20, message = "Le numéro de téléphone doit contenir entre 8 et 20 caractères")
    private String telephone;

    /** Nouveau mot de passe provisoire (facultatif : vide = inchangé). */
    private String password;

    /** Administrateur */
    private String departement;

    /** Chercheur */
    private String specialiteRecherche;

    /** Médecin */
    private String specialite;
    private String numeroOrdre;
    private List<Long> serviceIds;
}
