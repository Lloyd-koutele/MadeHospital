package made.hospital.audit.infra;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import made.hospital.audit.domaine.EntreeAudit;

@Repository
public interface EntreeAuditRepository extends JpaRepository<EntreeAudit, Long>, JpaSpecificationExecutor<EntreeAudit>
{

    Optional<EntreeAudit> findTopByOrderBySequenceDesc();

    @Query("select distinct e.action from EntreeAudit e order by e.action")
    List<String> actionsDistinctes();

    /** Parcours ordonné de la chaîne, par pages, pour la vérification. */
    Page<EntreeAudit> findAllByOrderBySequenceAsc(Pageable pageable);

    long countByActionAndActeurEmailAndHorodatageAfter(String action, String acteurEmail, Instant depuis);
}
