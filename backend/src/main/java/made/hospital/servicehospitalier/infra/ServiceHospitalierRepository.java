package made.hospital.servicehospitalier.infra;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

@Repository
public interface ServiceHospitalierRepository extends JpaRepository<ServiceHospitalier, Long>
{

    List<ServiceHospitalier> findAllByOrderByNomAsc();

    boolean existsByNomIgnoreCase(String nom);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByNomIgnoreCaseAndIdNot(String nom, Long id);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    java.util.List<ServiceHospitalier> findByChefIdOrderByNomAsc(Long chefId);

    default java.util.List<ServiceHospitalier> findByChefId(Long chefId)
    {
        return findByChefIdOrderByNomAsc(chefId);
    }
}
