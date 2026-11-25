package made.hospital.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import made.hospital.audit.application.EvenementAudit;
import made.hospital.audit.application.JournalAuditService;
import made.hospital.audit.domaine.EntreeAudit.Resultat;
import made.hospital.notification.domaine.Notification;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.notification.infra.NotificationRepository;
import made.hospital.utilisateur.domaine.Role;
import made.hospital.utilisateur.domaine.User;
import made.hospital.utilisateur.infra.UserRepository;

/**
 * Point d'entrée unique pour créer des notifications depuis les autres modules.
 *
 * Règles :
 * - une notification ne contient jamais de donnée médicale (ni résultat, ni diagnostic) ;
 * - un échec de notification ne fait jamais échouer l'action qui la déclenche ;
 * - chaque notification créée est inscrite au journal d'audit (sans son contenu).
 */
@Service
public class Notifier
{

    private static final Logger LOG = LoggerFactory.getLogger(Notifier.class);

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final JournalAuditService journal;

    public Notifier(NotificationRepository repository, UserRepository userRepository, JournalAuditService journal)
    {
        this.repository = repository;
        this.userRepository = userRepository;
        this.journal = journal;
    }

    /** Notifie un compte utilisateur par son identifiant. */
    public void notifier(Long destinataireId, TypeNotification type, String titre, String message, String lien)
    {
        creer(destinataireId, type, titre, message, lien, null);
    }

    /** Notifie un compte une seule fois pour une clé donnée (alertes répétées par des tâches planifiées). */
    public void notifierUneFois(Long destinataireId, String cle, TypeNotification type, String titre, String message, String lien)
    {
        creer(destinataireId, type, titre, message, lien, cle);
    }

    /** Notifie le compte associé à un email (utile pour les patients, connus par leur email). */
    public void notifierParEmail(String email, TypeNotification type, String titre, String message, String lien)
    {
        if (email == null || email.isBlank())
        {
            return;
        }
        userRepository.findByEmail(email.trim()).ifPresent(u -> creer(u.getId(), type, titre, message, lien, null));
    }

    /** Notifie tous les administrateurs actifs ; avec une clé, chacun ne la reçoit qu'une fois. */
    public void notifierAdministrateurs(TypeNotification type, String titre, String message, String lien, String cle)
    {
        for (User admin : userRepository.findByRoles(Role.ADMIN))
        {
            if (admin.isActif())
            {
                creer(admin.getId(), type, titre, message, lien, cle);
            }
        }
    }

    private void creer(Long destinataireId, TypeNotification type, String titre, String message, String lien, String cle)
    {
        if (destinataireId == null)
        {
            return;
        }
        try
        {
            if (cle != null && repository.existsByDestinataireIdAndCle(destinataireId, cle))
            {
                return;
            }
            Notification notification = new Notification();
            notification.setDestinataireId(destinataireId);
            notification.setType(type);
            notification.setPriorite(type.getPrioriteParDefaut());
            notification.setTitre(tronquer(titre, 150));
            notification.setMessage(tronquer(message, 500));
            notification.setLien(lien);
            notification.setCle(cle);
            Notification enregistree = repository.save(notification);

            journal.enregistrer(new EvenementAudit(null, "système", null, "NOTIFICATION_CREEE", "Notification envoyée",
                    null, null, "notification=" + enregistree.getId(), null, Resultat.SUCCES, null, null,
                    type.name() + " → utilisateur " + destinataireId));
        }
        catch (RuntimeException e)
        {
            LOG.error("Notification {} non créée pour l'utilisateur {} : {}", type, destinataireId, e.getMessage());
        }
    }

    private static String tronquer(String valeur, int max)
    {
        if (valeur == null)
        {
            return "";
        }
        return valeur.length() <= max ? valeur : valeur.substring(0, max - 1) + "…";
    }
}
