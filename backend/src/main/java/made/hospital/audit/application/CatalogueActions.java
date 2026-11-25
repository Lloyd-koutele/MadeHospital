package made.hospital.audit.application;

import java.util.HashMap;
import java.util.Map;

/**
 * Correspondance entre une route de l'API et l'action inscrite au journal (code + libellé lisible).
 * Les routes absentes sont tracées avec un code générique construit à partir de la méthode et du chemin.
 */
public final class CatalogueActions
{

    public record Action(String code, String libelle)
    {
    }

    private static final Map<String, Action> ACTIONS = new HashMap<>();

    static
    {
        // Authentification
        ajouter("POST /api/logout", "DECONNEXION", "Déconnexion");

        // Comptes
        ajouter("POST /api/admin/medecins", "COMPTE_MEDECIN_CREE", "Création d'un compte médecin");
        ajouter("POST /api/admin/chercheurs", "COMPTE_CHERCHEUR_CREE", "Création d'un compte chercheur");
        ajouter("POST /api/admin/admins", "COMPTE_ADMIN_CREE", "Création d'un compte administrateur");
        ajouter("PUT /api/admin/users/{userId}", "COMPTE_MODIFIE", "Modification d'un compte");
        ajouter("PUT /api/admin/users/status", "COMPTE_STATUT_MODIFIE", "Blocage ou déblocage d'un compte");

        // Services
        ajouter("POST /api/admin/services", "SERVICE_CREE", "Création d'un service");
        ajouter("PUT /api/admin/services/{id}", "SERVICE_MODIFIE", "Modification d'un service");
        ajouter("PATCH /api/admin/services/{id}/statut", "SERVICE_STATUT_MODIFIE", "Activation ou désactivation d'un service");
        ajouter("PUT /api/admin/services/{id}/medecins", "SERVICE_AFFECTATION", "Affectation des médecins d'un service");

        // Journal d'audit
        ajouter("GET /api/admin/audit/verification", "AUDIT_VERIFIE", "Vérification du journal d'audit");
        ajouter("GET /api/admin/audit/export", "AUDIT_EXPORTE", "Export du journal d'audit");

        // Patients et dossier médical (médecin)
        ajouter("POST /api/medecin/create-patient", "PATIENT_CREE", "Création d'un dossier patient");
        ajouter("GET /api/medecin/patients/{patientId}/dossier-medical", "DOSSIER_CONSULTE", "Consultation d'un dossier médical");
        ajouter("PUT /api/medecin/patients/{patientId}/dossier-medical", "DOSSIER_MODIFIE", "Modification d'un dossier médical");
        String consultations = "/api/medecin/patients/{patientId}/dossier-medical/consultations";
        ajouter("GET " + consultations, "CONSULTATIONS_LISTEES", "Consultation de la liste des consultations");
        ajouter("POST " + consultations, "CONSULTATION_CREEE", "Création d'une consultation");
        ajouter("GET " + consultations + "/{consultationId}", "CONSULTATION_LUE", "Lecture d'une consultation");
        ajouter("GET " + consultations + "/{consultationId}/analyses", "ANALYSES_LUES", "Lecture des analyses");
        ajouter("POST " + consultations + "/{consultationId}/analyses", "ANALYSE_CREEE", "Ajout d'une analyse");
        ajouter("GET " + consultations + "/{consultationId}/ordonnances", "ORDONNANCES_LUES", "Lecture des ordonnances");
        ajouter("POST " + consultations + "/{consultationId}/ordonnances", "ORDONNANCE_CREEE", "Ajout d'une ordonnance");
        ajouter("GET " + consultations + "/{consultationId}/images", "IMAGES_LISTEES", "Consultation de la liste des images");
        ajouter("POST " + consultations + "/{consultationId}/images", "IMAGE_AJOUTEE", "Ajout d'une image médicale");
        ajouter("GET " + consultations + "/{consultationId}/images/{imageId}/file", "IMAGE_CONSULTEE", "Consultation d'une image médicale");
        ajouter("GET " + consultations + "/{consultationId}/images/{imageId}/dicom", "IMAGE_CONSULTEE", "Consultation d'une image DICOM");
        ajouter("GET " + consultations + "/{consultationId}/images/{imageId}/preview", "IMAGE_CONSULTEE", "Aperçu d'une image DICOM");

        // Espace patient
        ajouter("GET /api/patient/mon-dossier-medical", "DOSSIER_CONSULTE_PATIENT", "Consultation de son dossier par le patient");
        ajouter("GET /api/patient/mes-consultations", "CONSULTATIONS_LISTEES_PATIENT", "Consultation de ses consultations par le patient");
        ajouter("GET /api/patient/mes-consultations/{consultationId}", "CONSULTATION_LUE_PATIENT", "Lecture d'une consultation par le patient");
        ajouter("POST /api/patient/acces-medecin", "ACCES_ACCORDE_PATIENT", "Accès au dossier accordé par le patient");
        ajouter("DELETE /api/patient/acces-medecin/{medecinId}", "ACCES_REVOQUE_PATIENT", "Accès au dossier révoqué par le patient");

        // Autorisations d'accès
        ajouter("POST /api/autorisations/patients/{patientId}/accorder", "ACCES_ACCORDE", "Accès au dossier accordé");
        ajouter("DELETE /api/autorisations/patients/{patientId}/medecins/{medecinId}", "ACCES_REVOQUE", "Accès au dossier révoqué");
        ajouter("DELETE /api/autorisations/acces/{autorisationId}", "ACCES_REVOQUE", "Accès au dossier révoqué");

        // Rendez-vous
        ajouter("POST /api/rendez-vous", "RDV_CREE", "Création d'un rendez-vous");
        ajouter("POST /api/rendez-vous/{id}/annuler", "RDV_ANNULE", "Annulation d'un rendez-vous");
        ajouter("POST /api/rendez-vous/{id}/reporter", "RDV_REPORTE", "Report d'un rendez-vous");
        ajouter("POST /api/rendez-vous/{id}/confirmer", "RDV_CONFIRME", "Confirmation d'un rendez-vous");
        ajouter("POST /api/rendez-vous/{id}/terminer", "RDV_TERMINE", "Rendez-vous terminé");
        ajouter("POST /api/rendez-vous/{id}/absence", "RDV_ABSENCE", "Absence au rendez-vous");
    }

    private CatalogueActions()
    {
    }

    private static void ajouter(String route, String code, String libelle)
    {
        ACTIONS.put(route, new Action(code, libelle));
    }

    /** Action connue pour cette route, ou null. */
    public static Action trouver(String methode, String motif)
    {
        return ACTIONS.get(methode + " " + motif);
    }

    /** Action générique pour une route non répertoriée. */
    public static Action generique(String methode, String motif)
    {
        return new Action("REQUETE_" + methode, methode + " " + motif);
    }
}
