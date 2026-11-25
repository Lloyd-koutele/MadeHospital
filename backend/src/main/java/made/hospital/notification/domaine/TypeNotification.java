package made.hospital.notification.domaine;

/**
 * Types de notification, avec leur priorité par défaut.
 * Aucun type ne transporte de donnée médicale : le contenu reste derrière la connexion.
 */
public enum TypeNotification
{
    // Rendez-vous
    RDV_PLANIFIE(Priorite.INFO),
    RDV_CONFIRME(Priorite.INFO),
    RDV_REPORTE(Priorite.IMPORTANT),
    RDV_ANNULE(Priorite.IMPORTANT),
    RDV_RAPPEL(Priorite.IMPORTANT),
    RDV_PROGRAMME_DU_JOUR(Priorite.INFO),

    // Dossier médical (patient)
    CONSULTATION_AJOUTEE(Priorite.INFO),
    ORDONNANCE_AJOUTEE(Priorite.IMPORTANT),
    RESULTAT_ANALYSE(Priorite.IMPORTANT),
    IMAGE_AJOUTEE(Priorite.INFO),

    // Accès aux dossiers
    ACCES_ACCORDE(Priorite.INFO),
    ACCES_REVOQUE(Priorite.IMPORTANT),
    ACCES_EXPIRE_BIENTOT(Priorite.IMPORTANT),

    // Comptes et services
    COMPTE_CREE(Priorite.INFO),
    MOT_DE_PASSE_REINITIALISE(Priorite.IMPORTANT),
    SERVICE_AFFECTE(Priorite.INFO),
    SERVICE_RETIRE(Priorite.IMPORTANT),

    // Administration
    AUDIT_RUPTURE(Priorite.CRITIQUE),
    CONNEXIONS_ECHOUEES(Priorite.CRITIQUE),
    MEDECIN_SANS_SERVICE(Priorite.IMPORTANT),
    SERVICE_DESACTIVE_AVEC_MEDECINS(Priorite.IMPORTANT),
    SERVICE_SANS_CHEF(Priorite.IMPORTANT),
    CHEF_DESIGNE(Priorite.IMPORTANT),

    // Documents et modèles
    DOCUMENT_DISPONIBLE(Priorite.INFO),
    MODELE_DEMANDE(Priorite.IMPORTANT),
    MODELE_PUBLIE(Priorite.INFO),
    MODELE_DEMANDE_REFUSEE(Priorite.INFO);

    private final Priorite prioriteParDefaut;

    TypeNotification(Priorite prioriteParDefaut)
    {
        this.prioriteParDefaut = prioriteParDefaut;
    }

    public Priorite getPrioriteParDefaut()
    {
        return prioriteParDefaut;
    }

    public enum Priorite
    {
        INFO, IMPORTANT, CRITIQUE
    }
}
