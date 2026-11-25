package made.hospital.notification.domaine;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import made.hospital.notification.domaine.TypeNotification.Priorite;

/**
 * Notification affichée dans l'application (cloche de la barre de navigation).
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notif_destinataire", columnList = "destinataire_id, lue"),
        @Index(name = "idx_notif_cle", columnList = "destinataire_id, cle")
})
@Getter
@Setter
@NoArgsConstructor
public class Notification
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant du compte utilisateur destinataire. */
    @Column(name = "destinataire_id", nullable = false)
    private Long destinataireId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TypeNotification type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Priorite priorite;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(nullable = false, length = 500)
    private String message;

    /** Page de l'application vers laquelle mène la notification (ex. /patient/rendez-vous). */
    @Column(length = 200)
    private String lien;

    /** Clé d'unicité facultative : évite d'envoyer deux fois la même alerte au même destinataire. */
    @Column(length = 120)
    private String cle;

    @Column(nullable = false)
    private boolean lue = false;

    @Column(name = "date_creation", nullable = false)
    private Instant dateCreation = Instant.now();

    @Column(name = "date_lecture")
    private Instant dateLecture;
}
