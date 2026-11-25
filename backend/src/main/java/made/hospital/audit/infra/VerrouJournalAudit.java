package made.hospital.audit.infra;

import java.sql.Connection;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import made.hospital.audit.application.AlertesAudit;
import made.hospital.audit.application.JournalAuditService;
import made.hospital.audit.application.VerificationAudit;

/**
 * Protections du journal d'audit en base :
 * - au démarrage (PostgreSQL), un déclencheur refuse tout UPDATE et DELETE sur la table journal_audit,
 *   même exécuté directement en SQL ;
 * - chaque nuit, la chaîne complète est revérifiée et une rupture est signalée dans les logs.
 */
@Component
public class VerrouJournalAudit implements ApplicationRunner
{

    private static final Logger LOG = LoggerFactory.getLogger(VerrouJournalAudit.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;
    private final JournalAuditService journal;
    private final ApplicationEventPublisher evenements;

    public VerrouJournalAudit(DataSource dataSource, JdbcTemplate jdbc, JournalAuditService journal,
                              ApplicationEventPublisher evenements)
    {
        this.evenements = evenements;
        this.dataSource = dataSource;
        this.jdbc = jdbc;
        this.journal = journal;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception
    {
        try (Connection connexion = dataSource.getConnection())
        {
            if (!"PostgreSQL".equalsIgnoreCase(connexion.getMetaData().getDatabaseProductName()))
            {
                return;
            }
        }
        jdbc.execute("""
                CREATE OR REPLACE FUNCTION journal_audit_ajout_seul() RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'Le journal d''audit est en ajout seul : % interdit', TG_OP;
                END;
                $$ LANGUAGE plpgsql
                """);
        jdbc.execute("DROP TRIGGER IF EXISTS journal_audit_protection ON journal_audit");
        jdbc.execute("""
                CREATE TRIGGER journal_audit_protection
                BEFORE UPDATE OR DELETE ON journal_audit
                FOR EACH ROW EXECUTE FUNCTION journal_audit_ajout_seul()
                """);
        LOG.info("Journal d'audit protégé en base : UPDATE et DELETE refusés");
    }

    /** Vérification quotidienne à 02h00. */
    @Scheduled(cron = "0 0 2 * * ?")
    public void verifierChaqueNuit()
    {
        VerificationAudit resultat = journal.verifier();
        if (resultat.integre())
        {
            LOG.info("Journal d'audit intègre ({} entrées vérifiées)", resultat.entreesVerifiees());
        }
        else
        {
            LOG.error("RUPTURE DU JOURNAL D'AUDIT à la séquence {} : {}", resultat.sequenceRupture(), resultat.raison());
            evenements.publishEvent(new AlertesAudit.RuptureJournal(String.valueOf(resultat.sequenceRupture()), resultat.raison()));
        }
    }
}
