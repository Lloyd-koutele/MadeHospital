package made.hospital.etablissement.domaine;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Identité de l'hôpital : nom et symbole affichés en haut des pages et sur les documents.
 * Une seule ligne (identifiant 1). Tant qu'elle n'est pas configurée, aucun compte ne peut être créé.
 */
@Entity
@Table(name = "parametres_etablissement")
@Getter
@Setter
@NoArgsConstructor
public class ParametresEtablissement
{

    public static final long IDENTIFIANT = 1L;

    public enum FormeLogo
    {
        RONDE, CARREE, RECTANGLE
    }

    @Id
    private Long id = IDENTIFIANT;

    @Column(nullable = false, length = 150)
    private String nom;

    /** Image PNG ré-encodée par le serveur ; vide quand le symbole par défaut est utilisé. */
    @Column(name = "logo")
    private byte[] logo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FormeLogo forme = FormeLogo.RONDE;

    @Column(name = "logo_par_defaut", nullable = false)
    private boolean logoParDefaut = true;

    @Column(name = "configure_le", nullable = false)
    private Instant configureLe;

    /** Incrémentée à chaque changement : sert à rafraîchir le logo dans les navigateurs. */
    @Column(nullable = false)
    private long version;
}
