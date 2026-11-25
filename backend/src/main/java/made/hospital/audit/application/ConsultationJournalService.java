package made.hospital.audit.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import made.hospital.audit.domaine.EntreeAudit;
import made.hospital.audit.infra.EntreeAuditRepository;

/**
 * Lecture du journal d'audit par les administrateurs : recherche filtrée, pagination et export CSV.
 */
@Service
public class ConsultationJournalService
{

    public static final ZoneId FUSEAU = ZoneId.of("Africa/Dakar");
    private static final int EXPORT_MAX = 50_000;

    private final EntreeAuditRepository repository;

    public ConsultationJournalService(EntreeAuditRepository repository)
    {
        this.repository = repository;
    }

    public record Filtres(String acteur, String action, Integer patientId, EntreeAudit.Resultat resultat,
                          LocalDate du, LocalDate au)
    {
    }

    @Transactional(readOnly = true)
    public Page<EntreeAudit> rechercher(Filtres filtres, int page, int taille)
    {
        int tailleBornee = Math.max(1, Math.min(taille, 200));
        return repository.findAll(specification(filtres),
                PageRequest.of(Math.max(0, page), tailleBornee, Sort.by(Sort.Direction.DESC, "sequence")));
    }

    @Transactional(readOnly = true)
    public String exporterCsv(Filtres filtres)
    {
        List<EntreeAudit> entrees = repository.findAll(specification(filtres),
                PageRequest.of(0, EXPORT_MAX, Sort.by(Sort.Direction.ASC, "sequence"))).getContent();
        StringBuilder csv = new StringBuilder();
        csv.append("sequence;horodatage;acteur;role;action;libelle;methode;chemin;ressource;patient;resultat;code_http;ip;details;empreinte_precedente;empreinte;signature\n");
        for (EntreeAudit e : entrees)
        {
            csv.append(List.of(
                            String.valueOf(e.getSequence()), String.valueOf(e.getHorodatage()), texte(e.getActeurEmail()),
                            texte(e.getActeurRole()), texte(e.getAction()), texte(e.getLibelle()), texte(e.getMethodeHttp()),
                            texte(e.getChemin()), texte(e.getRessourceId()),
                            e.getPatientId() == null ? "" : String.valueOf(e.getPatientId()), String.valueOf(e.getResultat()),
                            e.getCodeHttp() == null ? "" : String.valueOf(e.getCodeHttp()), texte(e.getAdresseIp()),
                            texte(e.getDetails()), e.getEmpreintePrecedente(), e.getEmpreinte(), e.getSignature())
                    .stream().map(ConsultationJournalService::cellule).collect(Collectors.joining(";")));
            csv.append('\n');
        }
        return csv.toString();
    }

    /** Codes d'action déjà présents dans le journal (liste du filtre). */
    @Transactional(readOnly = true)
    public List<String> actionsConnues()
    {
        return repository.actionsDistinctes();
    }

    private static Specification<EntreeAudit> specification(Filtres f)
    {
        return (racine, requete, cb) -> {
            List<Predicate> conditions = new ArrayList<>();
            if (f.acteur() != null && !f.acteur().isBlank())
            {
                conditions.add(cb.like(cb.lower(racine.get("acteurEmail")), "%" + f.acteur().trim().toLowerCase() + "%"));
            }
            if (f.action() != null && !f.action().isBlank())
            {
                conditions.add(cb.equal(racine.get("action"), f.action().trim()));
            }
            if (f.patientId() != null)
            {
                conditions.add(cb.equal(racine.get("patientId"), f.patientId()));
            }
            if (f.resultat() != null)
            {
                conditions.add(cb.equal(racine.get("resultat"), f.resultat()));
            }
            if (f.du() != null)
            {
                Instant debut = f.du().atStartOfDay(FUSEAU).toInstant();
                conditions.add(cb.greaterThanOrEqualTo(racine.get("horodatage"), debut));
            }
            if (f.au() != null)
            {
                Instant fin = f.au().plusDays(1).atStartOfDay(FUSEAU).toInstant();
                conditions.add(cb.lessThan(racine.get("horodatage"), fin));
            }
            return cb.and(conditions.toArray(new Predicate[0]));
        };
    }

    private static String texte(String valeur)
    {
        return valeur == null ? "" : valeur;
    }

    /** Cellule CSV : guillemets si nécessaire, et neutralisation des formules de tableur. */
    private static String cellule(String valeur)
    {
        String v = valeur;
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0)
        {
            v = "'" + v;
        }
        if (v.contains(";") || v.contains("\"") || v.contains("\n"))
        {
            v = "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }
}
