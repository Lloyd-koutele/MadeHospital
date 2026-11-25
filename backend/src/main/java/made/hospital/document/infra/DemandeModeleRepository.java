package made.hospital.document.infra;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import made.hospital.document.domaine.DemandeModele;

public interface DemandeModeleRepository extends JpaRepository<DemandeModele, Long>
{

    List<DemandeModele> findByServiceIdInOrderByDateCreationDesc(Collection<Long> serviceIds);

    long countByServiceIdInAndStatut(Collection<Long> serviceIds, DemandeModele.Statut statut);

    List<DemandeModele> findByDemandeurIdOrderByDateCreationDesc(Long demandeurId);
}
