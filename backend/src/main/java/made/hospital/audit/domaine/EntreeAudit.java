package made.hospital.audit.domaine;

import java.time.Instant;

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
 * Entrée du journal d'audit. Chaque entrée contient l'empreinte SHA-256 de la précédente (chaînage)
 * et sa propre empreinte signée en Ed25519 : toute modification, suppression ou insertion est détectable.
 * La table est en ajout seul (aucune route de modification ; verrou SQL contre UPDATE et DELETE).
 */
@Entity
@Table(name = "journal_audit", indexes = {
        @Index(name = "idx_audit_horodatage", columnList = "horodatage"),
        @Index(name = "idx_audit_patient", columnList = "patient_id"),
        @Index(name = "idx_audit_acteur", columnList = "acteur_email")
})
@Getter
@Setter
@NoArgsConstructor
public class EntreeAudit
{

    public enum Resultat
    {
        SUCCES, REFUS, ECHEC
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Position dans la chaîne, sans trou, à partir de 1. */
    @Column(nullable = false, unique = true)
    private Long sequence;

    @Column(nullable = false)
    private Instant horodatage;

    @Column(name = "acteur_id")
    private Long acteurId;

    /** Email de l'auteur, « système » pour les tâches planifiées, « anonyme » sans connexion. */
    @Column(name = "acteur_email", nullable = false, length = 150)
    private String acteurEmail;

    @Column(name = "acteur_role", length = 20)
    private String acteurRole;

    /** Code de l'action, ex. CONSULTATION_CREEE. */
    @Column(nullable = false, length = 60)
    private String action;

    /** Libellé lisible de l'action. */
    @Column(nullable = false, length = 150)
    private String libelle;

    @Column(name = "methode_http", length = 10)
    private String methodeHttp;

    @Column(length = 255)
    private String chemin;

    @Column(name = "ressource_id", length = 80)
    private String ressourceId;

    @Column(name = "patient_id")
    private Integer patientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Resultat resultat;

    @Column(name = "code_http")
    private Integer codeHttp;

    @Column(name = "adresse_ip", length = 64)
    private String adresseIp;

    @Column(length = 500)
    private String details;

    @Column(name = "empreinte_precedente", nullable = false, length = 64)
    private String empreintePrecedente;

    @Column(nullable = false, length = 64, unique = true)
    private String empreinte;

    @Column(nullable = false, length = 120)
    private String signature;
}
