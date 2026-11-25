package made.hospital.document.domaine;

import java.time.LocalDateTime;

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
 * Modèle de document : texte déjà rédigé et champs à remplir, défini une fois par le chef de service.
 * Sans service, le modèle appartient à la bibliothèque de l'hôpital (modèles livrés avec le logiciel).
 */
@Entity
@Table(name = "modeles_documents", indexes = @Index(name = "idx_modele_service", columnList = "service_id, statut"))
@Getter
@Setter
@NoArgsConstructor
public class ModeleDocument
{

    public enum Statut
    {
        BROUILLON, PUBLIE, ARCHIVE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TypeDocument type;

    /** Service propriétaire ; null pour la bibliothèque de l'hôpital. */
    @Column(name = "service_id")
    private Long serviceId;

    /** Modèle livré avec le logiciel (non modifiable, copiable). */
    @Column(nullable = false)
    private boolean systeme;

    /** Clé stable des modèles système (pour les mettre à jour sans doublon). */
    @Column(name = "cle_systeme", length = 60, unique = true)
    private String cleSysteme;

    @Column(nullable = false)
    private int version = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Statut statut = Statut.BROUILLON;

    /** Structure JSON : sections, textes fixes, champs automatiques et champs à saisir. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String structure;

    @Column(name = "cree_par_id")
    private Long creeParId;

    @Column(name = "modele_origine_id")
    private Long modeleOrigineId;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @Column(name = "date_publication")
    private LocalDateTime datePublication;
}
