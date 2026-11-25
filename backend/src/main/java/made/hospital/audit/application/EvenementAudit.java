package made.hospital.audit.application;

import made.hospital.audit.domaine.EntreeAudit.Resultat;

/**
 * Événement à inscrire au journal d'audit (avant chaînage et signature).
 */
public record EvenementAudit(
        Long acteurId,
        String acteurEmail,
        String acteurRole,
        String action,
        String libelle,
        String methodeHttp,
        String chemin,
        String ressourceId,
        Integer patientId,
        Resultat resultat,
        Integer codeHttp,
        String adresseIp,
        String details)
{
}
