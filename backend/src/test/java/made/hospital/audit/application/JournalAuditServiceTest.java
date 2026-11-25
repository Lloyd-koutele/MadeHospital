package made.hospital.audit.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import made.hospital.audit.domaine.EntreeAudit;
import made.hospital.audit.domaine.EntreeAudit.Resultat;
import made.hospital.audit.infra.CleSignatureAudit;
import made.hospital.audit.infra.EntreeAuditRepository;

class JournalAuditServiceTest
{

    @TempDir
    Path dossierCles;

    private final List<EntreeAudit> table = new ArrayList<>();
    private JournalAuditService journal;

    @BeforeEach
    void preparer() throws Exception
    {
        EntreeAuditRepository repository = mock(EntreeAuditRepository.class);
        when(repository.findTopByOrderBySequenceDesc()).thenAnswer(i ->
                table.stream().max(Comparator.comparing(EntreeAudit::getSequence)));
        when(repository.save(any())).thenAnswer(i -> {
            table.add(i.getArgument(0));
            return i.getArgument(0);
        });
        when(repository.findAllByOrderBySequenceAsc(any(Pageable.class))).thenAnswer(i -> new PageImpl<>(
                table.stream().sorted(Comparator.comparing(EntreeAudit::getSequence)).toList()));

        PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
        when(transactions.getTransaction(any())).thenReturn(mock(TransactionStatus.class));

        CleSignatureAudit cle = new CleSignatureAudit(dossierCles.toString());
        cle.charger();
        journal = new JournalAuditService(repository, cle, transactions);

        for (int i = 1; i <= 3; i++)
        {
            journal.enregistrer(new EvenementAudit(1L, "admin@madehospital.sn", "ADMIN", "SERVICE_CREE",
                    "Création d'un service", "POST", "/api/admin/services", null, null, Resultat.SUCCES, 201,
                    "127.0.0.1", "essai " + i));
        }
    }

    @Test
    void lesEntreesSontChaineesEtLaChaineEstIntegre()
    {
        assertThat(table).hasSize(3);
        assertThat(table.get(0).getEmpreintePrecedente()).isEqualTo(JournalAuditService.EMPREINTE_ORIGINE);
        assertThat(table.get(1).getEmpreintePrecedente()).isEqualTo(table.get(0).getEmpreinte());
        assertThat(table.get(2).getEmpreintePrecedente()).isEqualTo(table.get(1).getEmpreinte());

        VerificationAudit resultat = journal.verifier();
        assertThat(resultat.integre()).isTrue();
        assertThat(resultat.entreesVerifiees()).isEqualTo(3);
    }

    @Test
    void uneModificationDuContenuEstDetectee()
    {
        table.get(1).setDetails("contenu falsifié");

        VerificationAudit resultat = journal.verifier();
        assertThat(resultat.integre()).isFalse();
        assertThat(resultat.sequenceRupture()).isEqualTo(2L);
        assertThat(resultat.raison()).contains("Contenu modifié");
    }

    @Test
    void uneSuppressionEstDetectee()
    {
        table.remove(1);

        VerificationAudit resultat = journal.verifier();
        assertThat(resultat.integre()).isFalse();
        assertThat(resultat.raison()).contains("Entrée manquante");
    }

    @Test
    void uneEmpreinteRecalculeeSansLaCleEstDetectee()
    {
        EntreeAudit cible = table.get(2);
        cible.setDetails("falsifié puis recalculé");
        cible.setEmpreinte(JournalAuditService.calculerEmpreinte(cible));

        VerificationAudit resultat = journal.verifier();
        assertThat(resultat.integre()).isFalse();
        assertThat(resultat.raison()).contains("Signature invalide");
    }

    @Test
    void laJournalisationReprendApresUneEntreeExistante()
    {
        assertThat(table.get(2).getSequence()).isEqualTo(3L);
        assertThat(Optional.ofNullable(table.get(2).getSignature())).isPresent();
    }
}
