package made.hospital.audit.application;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;
import made.hospital.audit.domaine.EntreeAudit.Resultat;
import made.hospital.audit.infra.EntreeAuditRepository;
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Transforme une requête HTTP terminée en entrée du journal d'audit.
 *
 * Règles : toutes les écritures (POST, PUT, PATCH, DELETE) sont tracées ; parmi les lectures, seules celles
 * qui touchent aux données médicales ou au journal lui-même ; tous les refus d'accès (403) sont tracés.
 */
@Component
public class AuditRequetes
{

    /** Seuil d'alerte : nombre d'échecs de connexion pour un même email dans la fenêtre. */
    private static final int SEUIL_ECHECS = 5;
    private static final int FENETRE_MINUTES = 15;

    private final JournalAuditService journal;
    private final EntreeAuditRepository entrees;
    private final ApplicationEventPublisher evenements;

    public AuditRequetes(JournalAuditService journal, EntreeAuditRepository entrees, ApplicationEventPublisher evenements)
    {
        this.journal = journal;
        this.entrees = entrees;
        this.evenements = evenements;
    }

    public boolean doitTracer(HttpServletRequest requete, int statut)
    {
        String chemin = requete.getRequestURI();
        if (!chemin.startsWith("/api/") || "OPTIONS".equals(requete.getMethod()))
        {
            return false;
        }
        if (chemin.equals("/api/login"))
        {
            return false; // tracée explicitement par AuthController, avec l'email saisi
        }
        if (chemin.startsWith("/api/notifications"))
        {
            return false; // la lecture des notifications n'est pas tracée ; leur création l'est (Notifier)
        }
        if (statut == 403)
        {
            return true;
        }
        if (!"GET".equals(requete.getMethod()))
        {
            return true;
        }
        String motif = motif(requete);
        return motif.contains("{patientId}")
                || motif.startsWith("/api/patient/mes-")
                || motif.startsWith("/api/patient/mon-")
                || motif.startsWith("/api/medecin/documents/")
                || motif.equals("/api/admin/audit/verification")
                || motif.equals("/api/admin/audit/export");
    }

    /** Inscrit la requête au journal avec le statut HTTP final. */
    public void tracer(HttpServletRequest requete, int statut, String details)
    {
        String motif = motif(requete);
        CatalogueActions.Action action = CatalogueActions.trouver(requete.getMethod(), motif);
        if (action == null)
        {
            action = CatalogueActions.generique(requete.getMethod(), motif);
        }
        if (statut == 403)
        {
            action = new CatalogueActions.Action("ACCES_REFUSE", "Accès refusé — " + action.libelle());
        }
        Map<String, String> variables = variables(requete);
        UserDetailsImpl acteur = acteurCourant();
        journal.enregistrer(new EvenementAudit(
                acteur == null ? null : acteur.getId(),
                acteur == null ? "anonyme" : acteur.getEmail(),
                acteur == null ? null : acteur.getRole().name(),
                action.code(),
                action.libelle(),
                requete.getMethod(),
                requete.getRequestURI(),
                ressourceId(variables),
                patientId(variables),
                resultat(statut),
                statut,
                requete.getRemoteAddr(),
                details));
    }

    /** Connexion (réussie ou non) : l'acteur est l'email saisi, pas encore authentifié. */
    public void tracerConnexion(HttpServletRequest requete, String email, Long acteurId, String role, boolean reussie, String raison)
    {
        journal.enregistrer(new EvenementAudit(
                acteurId,
                email == null || email.isBlank() ? "anonyme" : email.trim().toLowerCase(),
                role,
                reussie ? "CONNEXION_REUSSIE" : "CONNEXION_ECHOUEE",
                reussie ? "Connexion" : "Échec de connexion",
                requete.getMethod(),
                requete.getRequestURI(),
                null,
                null,
                reussie ? Resultat.SUCCES : Resultat.REFUS,
                reussie ? 200 : 401,
                requete.getRemoteAddr(),
                raison));
        if (!reussie && email != null && !email.isBlank())
        {
            signalerEchecsRepetes(email.trim().toLowerCase());
        }
    }

    /** Alerte les administrateurs quand un même email accumule les échecs (essais de mots de passe). */
    private void signalerEchecsRepetes(String email)
    {
        try
        {
            long echecs = entrees.countByActionAndActeurEmailAndHorodatageAfter("CONNEXION_ECHOUEE", email,
                    Instant.now().minus(FENETRE_MINUTES, ChronoUnit.MINUTES));
            if (echecs >= SEUIL_ECHECS)
            {
                evenements.publishEvent(new AlertesAudit.ConnexionsEchoueesRepetees(email, echecs, FENETRE_MINUTES));
            }
        }
        catch (RuntimeException e)
        {
            // une alerte manquée ne doit jamais bloquer la réponse de connexion
        }
    }

    private static Resultat resultat(int statut)
    {
        if (statut >= 200 && statut < 400)
        {
            return Resultat.SUCCES;
        }
        return statut == 401 || statut == 403 ? Resultat.REFUS : Resultat.ECHEC;
    }

    private static UserDetailsImpl acteurCourant()
    {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserDetailsImpl u ? u : null;
    }

    private static String motif(HttpServletRequest requete)
    {
        Object motif = requete.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return motif != null ? motif.toString() : requete.getRequestURI();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> variables(HttpServletRequest requete)
    {
        Object vars = requete.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        return vars instanceof Map<?, ?> m ? (Map<String, String>) m : Map.of();
    }

    private static Integer patientId(Map<String, String> variables)
    {
        try
        {
            return variables.containsKey("patientId") ? Integer.valueOf(variables.get("patientId")) : null;
        }
        catch (NumberFormatException e)
        {
            return null;
        }
    }

    private static String ressourceId(Map<String, String> variables)
    {
        for (String cle : new String[] {"imageId", "consultationId", "autorisationId", "medecinId", "userId", "id"})
        {
            if (variables.containsKey(cle))
            {
                return cle + "=" + variables.get(cle);
            }
        }
        return null;
    }
}
