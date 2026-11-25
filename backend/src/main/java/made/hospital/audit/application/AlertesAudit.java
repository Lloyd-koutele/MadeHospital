package made.hospital.audit.application;

/**
 * Événements publiés par le module d'audit lorsqu'une situation mérite l'attention des administrateurs.
 * Le module de notification les écoute ; l'audit ne dépend donc pas des notifications.
 */
public final class AlertesAudit
{

    private AlertesAudit()
    {
    }

    /** La vérification de la chaîne a détecté une rupture. */
    public record RuptureJournal(String sequence, String raison)
    {
    }

    /** Plusieurs échecs de connexion successifs pour un même email. */
    public record ConnexionsEchoueesRepetees(String email, long echecs, int minutes)
    {
    }
}
