package made.hospital.document.infra;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import made.hospital.document.domaine.DocumentMedical;

public interface DocumentMedicalRepository extends JpaRepository<DocumentMedical, UUID>
{

    List<DocumentMedical> findByPatientIdOrderByDateCreationDesc(Integer patientId);

    List<DocumentMedical> findByPatientIdAndStatutInOrderByDateCreationDesc(Integer patientId, List<DocumentMedical.Statut> statuts);

    Optional<DocumentMedical> findByNumero(String numero);

    boolean existsByOrigine(String origine);

    boolean existsByModeleId(Long modeleId);

    @Query("select d.modeleId, count(d) from DocumentMedical d where d.auteurId = :auteurId and d.modeleId is not null group by d.modeleId")
    List<Object[]> utilisationsParModele(@Param("auteurId") Long auteurId);
}
