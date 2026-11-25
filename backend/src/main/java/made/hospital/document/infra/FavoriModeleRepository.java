package made.hospital.document.infra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import made.hospital.document.domaine.FavoriModele;

public interface FavoriModeleRepository extends JpaRepository<FavoriModele, Long>
{

    List<FavoriModele> findByMedecinId(Long medecinId);

    Optional<FavoriModele> findByMedecinIdAndModeleId(Long medecinId, Long modeleId);

    void deleteByModeleId(Long modeleId);
}
