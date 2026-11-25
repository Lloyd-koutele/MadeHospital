package made.hospital.document.domaine;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Séjour hospitalier d'un patient (admission → sortie), auquel se rattache le compte rendu d'hospitalisation.
 */
@Entity
@Table(name = "sejours", indexes = @Index(name = "idx_sejour_patient", columnList = "patient_id"))
@Getter
@Setter
@NoArgsConstructor
public class Sejour
{

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 30, unique = true)
    private String numero;

    @Column(name = "patient_id", nullable = false)
    private Integer patientId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "service_nom", length = 100)
    private String serviceNom;

    @Column(length = 30)
    private String lit;

    @Column(length = 500)
    private String motif;

    @Column(name = "medecin_id")
    private Long medecinId;

    @Column(name = "medecin_nom", length = 150)
    private String medecinNom;

    @Column(name = "date_entree", nullable = false)
    private LocalDateTime dateEntree;

    @Column(name = "date_sortie")
    private LocalDateTime dateSortie;

    public boolean estEnCours()
    {
        return dateSortie == null;
    }
}
