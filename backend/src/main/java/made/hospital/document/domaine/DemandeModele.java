package made.hospital.document.domaine;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Demande d'un médecin au chef de son service pour un modèle qui n'existe pas encore.
 * Une proposition faite depuis un document libre n'emporte que la structure, jamais de donnée patient.
 */
@Entity
@Table(name = "demandes_modeles")
@Getter
@Setter
@NoArgsConstructor
public class DemandeModele
{

    public enum Statut
    {
        OUVERTE, TRAITEE, REFUSEE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "demandeur_id", nullable = false)
    private Long demandeurId;

    @Column(name = "demandeur_nom", length = 150)
    private String demandeurNom;

    @Column(nullable = false, length = 150)
    private String intitule;

    @Column(length = 1000)
    private String details;

    /** Structure proposée (titres de sections seulement), issue d'un document libre. */
    @Column(name = "structure_proposee", columnDefinition = "TEXT")
    private String structureProposee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Statut statut = Statut.OUVERTE;

    @Column(name = "modele_id")
    private Long modeleId;

    @Column(length = 500)
    private String reponse;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;
}
