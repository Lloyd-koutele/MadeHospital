package made.hospital.notification.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import made.hospital.notification.domaine.Notification;
import made.hospital.notification.infra.NotificationRepository;
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Notifications de l'utilisateur connecté. Chacun ne voit et ne modifie que les siennes.
 */
@Tag(name = "Notifications", description = "Notifications de l'utilisateur connecté")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController
{

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository)
    {
        this.repository = repository;
    }

    public record NotificationDto(Long id, String type, String priorite, String titre, String message, String lien,
                                  boolean lue, String dateCreation)
    {
        static NotificationDto depuis(Notification n)
        {
            return new NotificationDto(n.getId(), n.getType().name(), n.getPriorite().name(), n.getTitre(),
                    n.getMessage(), n.getLien(), n.isLue(), n.getDateCreation().toString());
        }
    }

    public record PageDto(List<NotificationDto> notifications, long nonLues, boolean suite)
    {
    }

    @Operation(summary = "Mes notifications, de la plus récente à la plus ancienne")
    @GetMapping
    public PageDto lister(@AuthenticationPrincipal UserDetailsImpl currentUser,
                          @RequestParam(defaultValue = "false") boolean nonLuesSeulement,
                          @RequestParam(defaultValue = "0") int page,
                          @RequestParam(defaultValue = "20") int taille)
    {
        PageRequest pagination = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(taille, 50)));
        Page<Notification> resultat = nonLuesSeulement
                ? repository.findByDestinataireIdAndLueFalseOrderByDateCreationDesc(currentUser.getId(), pagination)
                : repository.findByDestinataireIdOrderByDateCreationDesc(currentUser.getId(), pagination);
        return new PageDto(resultat.getContent().stream().map(NotificationDto::depuis).toList(),
                repository.countByDestinataireIdAndLueFalse(currentUser.getId()), resultat.hasNext());
    }

    @Operation(summary = "Nombre de notifications non lues")
    @GetMapping("/compteur")
    public Map<String, Long> compteur(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return Map.of("nonLues", repository.countByDestinataireIdAndLueFalse(currentUser.getId()));
    }

    @Operation(summary = "Marquer une notification comme lue")
    @PatchMapping("/{id}/lue")
    @Transactional
    public ResponseEntity<?> marquerLue(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        return repository.findByIdAndDestinataireId(id, currentUser.getId())
                .<ResponseEntity<?>>map(n -> {
                    if (!n.isLue())
                    {
                        n.setLue(true);
                        n.setDateLecture(Instant.now());
                    }
                    return ResponseEntity.ok(NotificationDto.depuis(n));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification introuvable")));
    }

    @Operation(summary = "Marquer toutes mes notifications comme lues")
    @PostMapping("/tout-lire")
    @Transactional
    public Map<String, Integer> toutLire(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return Map.of("marquees", repository.marquerToutesLues(currentUser.getId(), Instant.now()));
    }
}
