package made.hospital.notification.application;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import made.hospital.audit.application.AlertesAudit;
import made.hospital.notification.domaine.TypeNotification;

/**
 * Transforme les alertes du module d'audit en notifications pour les administrateurs.
 */
@Component
public class AlertesAdministrateurs
{

    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("yyyyMMddHH");

    private final Notifier notifier;

    public AlertesAdministrateurs(Notifier notifier)
    {
        this.notifier = notifier;
    }

    @EventListener
    public void ruptureJournal(AlertesAudit.RuptureJournal alerte)
    {
        notifier.notifierAdministrateurs(TypeNotification.AUDIT_RUPTURE,
                "Rupture du journal d'audit",
                "La vérification nocturne a détecté une rupture à l'entrée n° " + alerte.sequence()
                        + ". Lancez une vérification depuis le journal d'audit.",
                "/admin", "audit-rupture-" + alerte.sequence());
    }

    /** Une alerte au plus par email et par heure. */
    @EventListener
    public void connexionsEchouees(AlertesAudit.ConnexionsEchoueesRepetees alerte)
    {
        String email = alerte.email().length() > 80 ? alerte.email().substring(0, 80) : alerte.email();
        notifier.notifierAdministrateurs(TypeNotification.CONNEXIONS_ECHOUEES,
                "Échecs de connexion répétés",
                alerte.echecs() + " échecs de connexion en " + alerte.minutes() + " minutes pour " + email + ".",
                "/admin", "connexions-" + email + "-" + LocalDateTime.now().format(HEURE));
    }
}
