package made.hospital.utilisateur.api;

import made.hospital.utilisateur.api.dto.UtilisateurModificationDTO;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import made.hospital.securite.application.UserDetailsImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import made.hospital.utilisateur.api.dto.AdminCreationDTO;
import made.hospital.utilisateur.api.dto.ChercheurCreationDTO;
import made.hospital.medecin.api.dto.MedecinCreationDTO;
import made.hospital.utilisateur.api.dto.UserStatusUpdateDTO;
import made.hospital.utilisateur.application.AdminService;
import made.hospital.utilisateur.application.ChercheurService;
import made.hospital.medecin.application.MedecinService;
import made.hospital.utilisateur.application.UtilisateurService;
import made.hospital.utilisateur.domaine.User;
import made.hospital.utilisateur.domaine.Role;

import org.springframework.security.access.annotation.Secured;

@Tag(name = "Administration", description = "API d'administration pour la gestion des utilisateurs")
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RestController
public class AdminController {
    
    private final MedecinService medecinService;
    private final ChercheurService chercheurService;
    private final AdminService adminService;
    private final UtilisateurService utilisateurService;
    private final made.hospital.utilisateur.application.GestionComptesService gestionComptesService;

    public AdminController(MedecinService medecinService, ChercheurService chercheurService, AdminService adminService,
                           UtilisateurService utilisateurService,
                           made.hospital.utilisateur.application.GestionComptesService gestionComptesService) {
        this.medecinService = medecinService;
        this.chercheurService = chercheurService;
        this.adminService = adminService;
        this.utilisateurService = utilisateurService;
        this.gestionComptesService = gestionComptesService;
    }

    @Operation(summary = "Créer un nouveau médecin")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Médecin créé avec succès",
                content = @Content(schema = @Schema(implementation = MedecinCreationDTO.class))),
        @ApiResponse(responseCode = "400",
                description = "Email déjà utilisé ou données invalides"),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @PostMapping("/medecins")
    public ResponseEntity<?> createMedecin(@AuthenticationPrincipal UserDetailsImpl currentUser, @Valid @RequestBody MedecinCreationDTO dto) {
        return ResponseEntity.ok(medecinService.createMedecin(dto));
    }

    @Operation(summary = "Créer un nouveau chercheur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Chercheur créé avec succès",
                content = @Content(schema = @Schema(implementation = ChercheurCreationDTO.class))),
        @ApiResponse(responseCode = "400",
                description = "Email déjà utilisé ou données invalides"),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @PostMapping("/chercheurs")
    public ResponseEntity<?> createChercheur(@AuthenticationPrincipal UserDetailsImpl currentUser, @Valid @RequestBody ChercheurCreationDTO dto) {
        return ResponseEntity.ok(chercheurService.createChercheur(dto));
    }

    @Operation(summary = "Créer un nouvel administrateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Administrateur créé avec succès",
                content = @Content(schema = @Schema(implementation = AdminCreationDTO.class))),
        @ApiResponse(responseCode = "400",
                description = "Email déjà utilisé ou données invalides"),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(@AuthenticationPrincipal UserDetailsImpl currentUser, @Valid @RequestBody AdminCreationDTO dto) {
        return ResponseEntity.ok(adminService.createAdmin(dto));
    }

    @Operation(summary = "Fiche détaillée d'un utilisateur (champs du rôle, services d'un médecin)")
    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUser(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long userId) {
        return ResponseEntity.ok(gestionComptesService.detail(userId));
    }

    @Operation(summary = "Modifier un utilisateur (le rôle ne change pas)")
    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long userId,
                                        @Valid @RequestBody UtilisateurModificationDTO dto) {
        return ResponseEntity.ok(gestionComptesService.modifier(userId, dto));
    }

    @Operation(summary = "Récupérer tous les utilisateurs", description = "Permet à l'administrateur de récupérer la liste de tous les utilisateurs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Liste des utilisateurs récupérée avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        try {
            List<User> users = utilisateurService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la récupération des utilisateurs: " + e.getMessage());
        }
    }

    @Operation(summary = "Récupérer les médecins", description = "Permet à l'administrateur de récupérer la liste de tous les médecins")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Liste des médecins récupérée avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/medecins")
    public ResponseEntity<?> getAllMedecins(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        try {
            List<User> medecins = utilisateurService.getUsersByRole(Role.MEDECIN);
            return ResponseEntity.ok(medecins);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la récupération des médecins: " + e.getMessage());
        }
    }

    @Operation(summary = "Récupérer les chercheurs", description = "Permet à l'administrateur de récupérer la liste de tous les chercheurs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Liste des chercheurs récupérée avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/chercheurs")
    public ResponseEntity<?> getAllChercheurs(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        try {
            List<User> chercheurs = utilisateurService.getUsersByRole(Role.CHERCHEUR);
            return ResponseEntity.ok(chercheurs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la récupération des chercheurs: " + e.getMessage());
        }
    }

    @Operation(summary = "Récupérer les administrateurs", description = "Permet à l'administrateur de récupérer la liste de tous les administrateurs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Liste des administrateurs récupérée avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/admins")
    public ResponseEntity<?> getAllAdmins(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        try {
            List<User> admins = utilisateurService.getUsersByRole(Role.ADMIN);
            return ResponseEntity.ok(admins);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la récupération des administrateurs: " + e.getMessage());
        }
    }

    @Operation(summary = "Récupérer les utilisateurs inactifs", description = "Permet à l'administrateur de récupérer la liste des utilisateurs inactifs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Liste des utilisateurs inactifs récupérée avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/users/inactifs")
    public ResponseEntity<?> getUsersInactifs(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        try {
            List<User> users = utilisateurService.getUsersByStatus(false);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la récupération des utilisateurs inactifs: " + e.getMessage());
        }
    }

    @Operation(summary = "Vérifier si un utilisateur est actif", description = "Permet à l'administrateur de vérifier le statut d'un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Statut de l'utilisateur récupéré avec succès",
                content = @Content(schema = @Schema(implementation = Boolean.class))),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @GetMapping("/users/{userId}/status")
    public ResponseEntity<?> checkUserStatus(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long userId) {
        try {
            boolean isActive = utilisateurService.isUserActive(userId);
            return ResponseEntity.ok(isActive);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la vérification du statut: " + e.getMessage());
        }
    }

    @Operation(summary = "Mettre à jour le statut d'un utilisateur", description = "Permet à l'administrateur de bloquer/débloquer un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200",
                description = "Statut de l'utilisateur mis à jour avec succès",
                content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "400",
                description = "Utilisateur non trouvé ou erreur lors de la mise à jour"),
        @ApiResponse(responseCode = "403",
                description = "Accès refusé - Réservé aux administrateurs")
    })

    @Secured("ROLE_ADMIN")
    @PutMapping("/users/status")
    public ResponseEntity<?> updateUserStatus(@AuthenticationPrincipal UserDetailsImpl currentUser, @Valid @RequestBody UserStatusUpdateDTO dto) {
        try {
            User updatedUser = utilisateurService.updateUserStatus(dto);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur lors de la mise à jour du statut: " + e.getMessage());
        }
    }
}
