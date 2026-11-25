package made.hospital.document.infra;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import made.hospital.document.domaine.ModeleDocument;

public interface ModeleDocumentRepository extends JpaRepository<ModeleDocument, Long>
{

    /** Modèles publiés utilisables dans un service : ceux du service et ceux de l'hôpital. */
    @Query("select m from ModeleDocument m where m.statut = :statut"
            + " and (m.serviceId is null or m.serviceId = :serviceId) order by m.nom")
    List<ModeleDocument> disponibles(@Param("serviceId") Long serviceId, @Param("statut") ModeleDocument.Statut statut);

    default List<ModeleDocument> disponiblesPour(Long serviceId)
    {
        return disponibles(serviceId, ModeleDocument.Statut.PUBLIE);
    }

    List<ModeleDocument> findByServiceIdInOrderByNomAsc(Collection<Long> serviceIds);

    List<ModeleDocument> findBySystemeTrueOrderByNomAsc();

    Optional<ModeleDocument> findByCleSysteme(String cleSysteme);
}
