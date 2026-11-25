package made.hospital.document.domaine;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Compteur de numérotation par préfixe et par année (ex. ORD-2026). */
@Entity
@Table(name = "compteurs_documents")
@Getter
@Setter
@NoArgsConstructor
public class CompteurDocument
{

    @Id
    @Column(length = 20)
    private String cle;

    @Column(nullable = false)
    private long valeur;

    public CompteurDocument(String cle)
    {
        this.cle = cle;
    }
}
