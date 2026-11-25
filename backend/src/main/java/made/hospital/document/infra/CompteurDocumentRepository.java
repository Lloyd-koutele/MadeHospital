package made.hospital.document.infra;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import made.hospital.document.domaine.CompteurDocument;

public interface CompteurDocumentRepository extends JpaRepository<CompteurDocument, String>
{

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CompteurDocument c where c.cle = :cle")
    Optional<CompteurDocument> verrouiller(@Param("cle") String cle);
}
