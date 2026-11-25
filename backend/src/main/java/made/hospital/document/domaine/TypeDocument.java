package made.hospital.document.domaine;

/**
 * Types de documents médicaux, avec le préfixe de leur numéro (ex. ORD-2026-000123).
 */
public enum TypeDocument
{
    COMPTE_RENDU_CONSULTATION("CRC", "Compte rendu de consultation"),
    ORDONNANCE("ORD", "Ordonnance"),
    DEMANDE_EXAMEN("DEM", "Demande d'examen"),
    RESULTAT_EXAMEN("RES", "Résultats d'examen"),
    COMPTE_RENDU_IMAGERIE("CRI", "Compte rendu d'imagerie"),
    COMPTE_RENDU_HOSPITALISATION("CRH", "Compte rendu d'hospitalisation"),
    COMPTE_RENDU_OPERATOIRE("CRO", "Compte rendu opératoire"),
    CERTIFICAT("CER", "Certificat médical"),
    DOCUMENT_LIBRE("DOC", "Document libre"),
    AUTRE("DOC", "Document");

    private final String prefixe;
    private final String libelle;

    TypeDocument(String prefixe, String libelle)
    {
        this.prefixe = prefixe;
        this.libelle = libelle;
    }

    public String getPrefixe()
    {
        return prefixe;
    }

    public String getLibelle()
    {
        return libelle;
    }
}
