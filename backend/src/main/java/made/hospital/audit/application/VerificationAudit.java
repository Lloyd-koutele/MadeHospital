package made.hospital.audit.application;

import java.time.Instant;

/**
 * Résultat d'une vérification complète de la chaîne d'audit.
 *
 * @param integre             true si toutes les entrées sont cohérentes
 * @param entreesVerifiees    nombre d'entrées validées avant la fin ou la rupture
 * @param sequenceRupture     séquence de la première entrée en défaut (null si intègre)
 * @param raison              explication de la rupture (null si intègre)
 * @param verifieeLe          moment de la vérification
 */
public record VerificationAudit(boolean integre, long entreesVerifiees, Long sequenceRupture, String raison, Instant verifieeLe)
{

    static VerificationAudit integre(long entrees)
    {
        return new VerificationAudit(true, entrees, null, null, Instant.now());
    }

    static VerificationAudit rupture(long entreesValides, long sequence, String raison)
    {
        return new VerificationAudit(false, entreesValides, sequence, raison, Instant.now());
    }
}
