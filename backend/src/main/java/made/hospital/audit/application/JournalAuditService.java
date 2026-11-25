package made.hospital.audit.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import made.hospital.audit.domaine.EntreeAudit;
import made.hospital.audit.infra.CleSignatureAudit;
import made.hospital.audit.infra.EntreeAuditRepository;

/**
 * Écriture et vérification du journal d'audit chaîné et signé.
 *
 * empreinte(n) = SHA-256(champs de l'entrée n + empreinte(n-1)) ; signature(n) = Ed25519(empreinte(n)).
 * La première entrée s'accroche à une empreinte de 64 zéros.
 */
@Service
public class JournalAuditService
{

    public static final String EMPREINTE_ORIGINE = "0".repeat(64);
    private static final Logger LOG = LoggerFactory.getLogger(JournalAuditService.class);
    private static final char SEPARATEUR = '\u001F';

    private final EntreeAuditRepository repository;
    private final CleSignatureAudit cle;
    private final TransactionTemplate transactionIsolee;
    private final Object verrou = new Object();

    public JournalAuditService(EntreeAuditRepository repository, CleSignatureAudit cle, PlatformTransactionManager transactions)
    {
        this.repository = repository;
        this.cle = cle;
        this.transactionIsolee = new TransactionTemplate(transactions);
        // transaction propre : l'entrée est conservée même si l'action auditée échoue et annule la sienne
        this.transactionIsolee.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Ajoute une entrée en bout de chaîne. Le verrou couvre la lecture du dernier maillon ET la validation,
     * pour que deux requêtes simultanées ne s'accrochent jamais au même maillon.
     * Une erreur d'audit est journalisée mais ne bloque pas l'action de l'utilisateur.
     */
    public void enregistrer(EvenementAudit evenement)
    {
        try
        {
            synchronized (verrou)
            {
                transactionIsolee.executeWithoutResult(statut -> ajouter(evenement));
            }
        }
        catch (RuntimeException e)
        {
            LOG.error("Impossible d'écrire dans le journal d'audit ({}) : {}", evenement.action(), e.getMessage());
        }
    }

    private void ajouter(EvenementAudit e)
    {
        EntreeAudit derniere = repository.findTopByOrderBySequenceDesc().orElse(null);
        EntreeAudit entree = new EntreeAudit();
        entree.setSequence(derniere == null ? 1L : derniere.getSequence() + 1);
        entree.setHorodatage(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        entree.setActeurId(e.acteurId());
        entree.setActeurEmail(Objects.requireNonNullElse(e.acteurEmail(), "anonyme"));
        entree.setActeurRole(e.acteurRole());
        entree.setAction(e.action());
        entree.setLibelle(e.libelle());
        entree.setMethodeHttp(e.methodeHttp());
        entree.setChemin(tronquer(e.chemin(), 255));
        entree.setRessourceId(tronquer(e.ressourceId(), 80));
        entree.setPatientId(e.patientId());
        entree.setResultat(e.resultat());
        entree.setCodeHttp(e.codeHttp());
        entree.setAdresseIp(tronquer(e.adresseIp(), 64));
        entree.setDetails(tronquer(e.details(), 500));
        entree.setEmpreintePrecedente(derniere == null ? EMPREINTE_ORIGINE : derniere.getEmpreinte());
        entree.setEmpreinte(calculerEmpreinte(entree));
        entree.setSignature(cle.signer(entree.getEmpreinte()));
        repository.save(entree);
    }

    /** Recalcule toute la chaîne et s'arrête à la première incohérence. */
    public VerificationAudit verifier()
    {
        String precedente = EMPREINTE_ORIGINE;
        long sequenceAttendue = 1;
        int page = 0;
        Page<EntreeAudit> lot;
        do
        {
            lot = repository.findAllByOrderBySequenceAsc(PageRequest.of(page++, 500));
            for (EntreeAudit entree : lot)
            {
                if (entree.getSequence() != sequenceAttendue)
                {
                    return VerificationAudit.rupture(sequenceAttendue - 1, entree.getSequence(),
                            "Entrée manquante : la séquence " + sequenceAttendue + " est absente");
                }
                if (!entree.getEmpreintePrecedente().equals(precedente))
                {
                    return VerificationAudit.rupture(sequenceAttendue - 1, entree.getSequence(),
                            "Chaînage rompu : l'entrée ne pointe pas vers la précédente");
                }
                if (!calculerEmpreinte(entree).equals(entree.getEmpreinte()))
                {
                    return VerificationAudit.rupture(sequenceAttendue - 1, entree.getSequence(),
                            "Contenu modifié : l'empreinte ne correspond plus aux données");
                }
                if (!cle.verifier(entree.getEmpreinte(), entree.getSignature()))
                {
                    return VerificationAudit.rupture(sequenceAttendue - 1, entree.getSequence(),
                            "Signature invalide : l'entrée n'a pas été signée par ce serveur");
                }
                precedente = entree.getEmpreinte();
                sequenceAttendue++;
            }
        }
        while (lot.hasNext());
        return VerificationAudit.integre(sequenceAttendue - 1);
    }

    public String clePublique()
    {
        return cle.clePubliqueBase64();
    }

    static String calculerEmpreinte(EntreeAudit e)
    {
        String contenu = Stream.of(
                        e.getSequence(), e.getHorodatage(), e.getActeurId(), e.getActeurEmail(), e.getActeurRole(),
                        e.getAction(), e.getLibelle(), e.getMethodeHttp(), e.getChemin(), e.getRessourceId(),
                        e.getPatientId(), e.getResultat(), e.getCodeHttp(), e.getAdresseIp(), e.getDetails(),
                        e.getEmpreintePrecedente())
                .map(v -> v == null ? "" : v.toString())
                .collect(Collectors.joining(String.valueOf(SEPARATEUR)));
        try
        {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(contenu.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        }
        catch (NoSuchAlgorithmException ex)
        {
            throw new IllegalStateException(ex);
        }
    }

    private static String tronquer(String valeur, int max)
    {
        return valeur == null || valeur.length() <= max ? valeur : valeur.substring(0, max);
    }
}
