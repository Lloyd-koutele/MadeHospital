package made.hospital.securite.api;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import made.hospital.audit.application.AuditRequetes;
import made.hospital.securite.application.JwtService;
import made.hospital.securite.application.UserDetailsImpl;

@Tag(name = "Authentification", description = "Connexion, déconnexion et vérification des rôles")
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        bearerFormat = "JWT",
        scheme = "bearer"
)
@RestController
@RequestMapping({"/", "/api"})
@RequiredArgsConstructor
public class AuthController
{

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditRequetes auditRequetes;

    @Operation(
            summary = "Authentifier un utilisateur",
            description = "Connexion par email et mot de passe. Le rôle n'est pas choisi par le client : "
                    + "il est lu dans le compte de l'utilisateur et renvoyé dans la réponse."
    )
    @ApiResponses(value =
    {
            @ApiResponse(responseCode = "200", description = "Authentification réussie",
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "401", description = "Identifiants invalides ou compte bloqué")
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest requeteHttp)
    {
        try
        {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
            UserDetailsImpl utilisateur = (UserDetailsImpl) authentication.getPrincipal();
            String role = utilisateur.getRole().name();
            String token = jwtService.generateToken(utilisateur.getEmail(), role);
            auditRequetes.tracerConnexion(requeteHttp, utilisateur.getEmail(), utilisateur.getId(), role, true, null);
            return ResponseEntity.ok(new LoginResponse("Connexion réussie", token, role));
        }
        catch (DisabledException e)
        {
            auditRequetes.tracerConnexion(requeteHttp, request.getEmail(), null, null, false, "Compte bloqué");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Ce compte est bloqué. Contactez l'administrateur."));
        }
        catch (AuthenticationException e)
        {
            auditRequetes.tracerConnexion(requeteHttp, request.getEmail(), null, null, false, "Identifiants invalides");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Email ou mot de passe invalide."));
        }
    }

    @Operation(summary = "Utilisateur connecté", description = "Renvoie l'email et le rôle de l'utilisateur authentifié")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/moi")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> moi(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return ResponseEntity.ok(Map.of("email", currentUser.getEmail(), "role", currentUser.getRole().name()));
    }

    @Operation(summary = "Vérifier l'accès administrateur")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminEndpoint(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return ResponseEntity.ok("Accès admin autorisé");
    }

    @Operation(summary = "Vérifier l'accès médecin")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/medecin")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<String> docteurEndpoint(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return ResponseEntity.ok("Accès medecin autorisé");
    }

    @Operation(summary = "Vérifier l'accès chercheur")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/chercheur")
    @PreAuthorize("hasRole('CHERCHEUR')")
    public ResponseEntity<String> chercheurEndpoint(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return ResponseEntity.ok("Accès chercheur autorisé");
    }

    @Operation(summary = "Vérifier l'accès patient")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/check-role/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<String> patientEndpoint(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return ResponseEntity.ok("Accès patient autorisé");
    }

    @Operation(summary = "Déconnexion", description = "Permet à un utilisateur de se déconnecter")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader)
    {
        if (authHeader != null && authHeader.startsWith(JwtService.PREFIX))
        {
            SecurityContextHolder.clearContext();
            return ResponseEntity.ok(Map.of("message", "Déconnexion réussie"));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token non fourni"));
    }

    @Schema(description = "Requête de connexion")
    @lombok.Data
    public static class LoginRequest
    {
        @Schema(description = "Email de l'utilisateur", example = "user@hopital.sn", requiredMode = Schema.RequiredMode.REQUIRED)
        private String email;

        @Schema(description = "Mot de passe de l'utilisateur", example = "motdepasse", requiredMode = Schema.RequiredMode.REQUIRED)
        private String password;
    }

    @Schema(description = "Réponse de connexion")
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class LoginResponse
    {
        @Schema(description = "Message de confirmation", example = "Connexion réussie")
        private String message;

        @Schema(description = "Jeton JWT, préfixé par « Bearer »")
        private String token;

        @Schema(description = "Rôle du compte (ADMIN, MEDECIN, PATIENT, CHERCHEUR)", example = "MEDECIN")
        private String role;
    }
}
