package made.hospital.document.domaine;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Document médical d'un patient, créé à partir d'un modèle.
 *
 * Le document garde une copie de la structure du modèle : modifier le modèle ne change jamais un document.
 * Une fois validé, il est numéroté, verrouillé, haché (SHA-256) et signé ; une correction crée une nouvelle version.
 */
@Entity
@Table(name = "documents_medicaux", indexes = {
        @Index(name = "idx_document_patient", columnList = "patient_id"),
        @Index(name = "idx_document_numero", columnList = "numero", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
public class DocumentMedical
{

    public enum Statut
    {
        /** En cours de rédaction, visible par son auteur seulement. */
        BROUILLON,
        /** Signé et verrouillé. */
        VALIDE,
        /** Remplacé par une version corrigée. */
        RECTIFIE,
        /** Repris de l'ancien dossier (ordonnances et analyses antérieures), non signé. */
        IMPORTE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 30)
    private String numero;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TypeDocument type;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(name = "patient_id", nullable = false)
    private Integer patientId;

    @Column(name = "service_id")
    private Long serviceId;

    @Column(name = "service_nom", length = 100)
    private String serviceNom;

    @Column(name = "auteur_id")
    private Long auteurId;

    @Column(name = "auteur_nom", length = 150)
    private String auteurNom;

    @Column(name = "modele_id")
    private Long modeleId;

    @Column(name = "modele_version")
    private Integer modeleVersion;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String structure;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String valeurs = "{}";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Statut statut = Statut.BROUILLON;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(length = 64)
    private String empreinte;

    @Column(length = 200)
    private String signature;

    /** Version précédente que ce document corrige. */
    @Column(name = "remplace_id")
    private UUID remplaceId;

    /** Version corrigée qui remplace ce document. */
    @Column(name = "remplace_par_id")
    private UUID remplaceParId;

    @Column(name = "sejour_id")
    private UUID sejourId;

    /** Origine d'un document repris de l'ancien dossier (ex. ordonnance:uuid), pour ne pas le reprendre deux fois. */
    @Column(length = 80, unique = true)
    private String origine;
}
