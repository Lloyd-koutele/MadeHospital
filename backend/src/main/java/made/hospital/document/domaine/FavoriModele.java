package made.hospital.document.domaine;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Modèle marqué comme favori par un médecin (affiché en premier dans sa galerie). */
@Entity
@Table(name = "favoris_modeles", uniqueConstraints = @UniqueConstraint(columnNames = {"medecin_id", "modele_id"}))
@Getter
@Setter
@NoArgsConstructor
public class FavoriModele
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "medecin_id", nullable = false)
    private Long medecinId;

    @Column(name = "modele_id", nullable = false)
    private Long modeleId;

    public FavoriModele(Long medecinId, Long modeleId)
    {
        this.medecinId = medecinId;
        this.modeleId = modeleId;
    }
}
