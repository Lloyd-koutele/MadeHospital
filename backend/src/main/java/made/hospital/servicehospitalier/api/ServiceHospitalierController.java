package made.hospital.servicehospitalier.api;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.api.dto.ServiceHospitalierDto;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;

/**
 * Services de l'hôpital : gestion par les administrateurs, consultation par les médecins de leurs propres services.
 */
@Tag(name = "Services hospitaliers", description = "Création des services et affectation des médecins")
@SecurityRequirement(name = "bearerAuth")
@RestController
public class ServiceHospitalierController
{

    private final ServiceHospitalierService serviceHospitalierService;

    public ServiceHospitalierController(ServiceHospitalierService serviceHospitalierService)
    {
        this.serviceHospitalierService = serviceHospitalierService;
    }

    @Operation(summary = "Lister tous les services (administrateur)")
    @GetMapping("/api/admin/services")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ServiceHospitalierDto> lister(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return serviceHospitalierService.lister();
    }

    @Operation(summary = "Créer un service (administrateur)")
    @PostMapping("/api/admin/services")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceHospitalierDto> creer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                       @RequestBody ServiceHospitalierDto.Requete requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceHospitalierService.creer(requete));
    }

    @Operation(summary = "Modifier un service (administrateur)")
    @PutMapping("/api/admin/services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ServiceHospitalierDto modifier(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                          @PathVariable Long id,
                                          @RequestBody ServiceHospitalierDto.Requete requete)
    {
        return serviceHospitalierService.modifier(id, requete);
    }

    @Operation(summary = "Activer ou désactiver un service (administrateur)")
    @PatchMapping("/api/admin/services/{id}/statut")
    @PreAuthorize("hasRole('ADMIN')")
    public ServiceHospitalierDto changerStatut(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                               @PathVariable Long id,
                                               @RequestBody ServiceHospitalierDto.Statut statut)
    {
        return serviceHospitalierService.changerStatut(id, statut.actif());
    }

    @Operation(summary = "Définir les médecins affectés à un service (administrateur)")
    @PutMapping("/api/admin/services/{id}/medecins")
    @PreAuthorize("hasRole('ADMIN')")
    public ServiceHospitalierDto affecterMedecins(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                  @PathVariable Long id,
                                                  @RequestBody ServiceHospitalierDto.Affectation affectation)
    {
        return serviceHospitalierService.affecterMedecins(id, affectation.medecinIds());
    }

    @Operation(summary = "Désigner le chef d'un service (administrateur)")
    @PutMapping("/api/admin/services/{id}/chef")
    @PreAuthorize("hasRole('ADMIN')")
    public ServiceHospitalierDto designerChef(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                              @PathVariable Long id,
                                              @RequestBody ServiceHospitalierDto.Chef chef)
    {
        return serviceHospitalierService.designerChef(id, chef.medecinId());
    }

    @Operation(summary = "Services du médecin connecté")
    @GetMapping("/api/medecin/mes-services")
    @PreAuthorize("hasRole('MEDECIN')")
    public List<Map<String, Object>> mesServices(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return serviceHospitalierService.servicesDuMedecin(currentUser).stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId(),
                        "nom", s.getNom(),
                        "code", s.getCode(),
                        "actif", s.isActif(),
                        "chef", currentUser.getId().equals(s.getChefId())))
                .toList();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> requeteInvalide(IllegalArgumentException e)
    {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
}
