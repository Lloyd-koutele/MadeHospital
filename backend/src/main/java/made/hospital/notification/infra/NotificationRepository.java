package made.hospital.notification.infra;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import made.hospital.notification.domaine.Notification;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long>
{

    Page<Notification> findByDestinataireIdOrderByDateCreationDesc(Long destinataireId, Pageable pageable);

    Page<Notification> findByDestinataireIdAndLueFalseOrderByDateCreationDesc(Long destinataireId, Pageable pageable);

    long countByDestinataireIdAndLueFalse(Long destinataireId);

    boolean existsByDestinataireIdAndCle(Long destinataireId, String cle);

    Optional<Notification> findByIdAndDestinataireId(Long id, Long destinataireId);

    @Modifying
    @Query("update Notification n set n.lue = true, n.dateLecture = :maintenant where n.destinataireId = :destinataire and n.lue = false")
    int marquerToutesLues(@Param("destinataire") Long destinataireId, @Param("maintenant") Instant maintenant);
}
