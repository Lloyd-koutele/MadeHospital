package made.hospital.servicehospitalier.domaine;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Service de l'hôpital (Imagerie, Odontologie, Cardiologie...).
 * Créé et géré par les administrateurs ; les médecins y sont affectés (voir MedecinEntite.services)
 * et ne consultent que les consultations faites dans leurs services.
 */
@Entity
@Table(name = "services_hospitaliers")
@Data
@NoArgsConstructor
public class ServiceHospitalier
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nom;

    /** Code court affiché dans les badges (ex. IMG, ODO). */
    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(length = 500)
    private String description;

    /** Un service désactivé n'accepte plus de nouvelles consultations ; son historique reste consultable. */
    @Column(nullable = false)
    private boolean actif = true;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    /** Médecin chef du service (un seul) : il gère les modèles de documents du service. */
    @Column(name = "chef_id")
    private Long chefId;

    public ServiceHospitalier(String nom, String code, String description)
    {
        this.nom = nom;
        this.code = code;
        this.description = description;
    }
}
