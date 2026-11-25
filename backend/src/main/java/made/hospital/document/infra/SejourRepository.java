package made.hospital.document.infra;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import made.hospital.document.domaine.Sejour;

public interface SejourRepository extends JpaRepository<Sejour, UUID>
{

    List<Sejour> findByPatientIdOrderByDateEntreeDesc(Integer patientId);

    boolean existsByPatientIdAndDateSortieIsNull(Integer patientId);
}
