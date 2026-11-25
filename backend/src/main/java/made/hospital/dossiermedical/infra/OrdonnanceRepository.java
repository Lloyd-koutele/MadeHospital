package made.hospital.dossiermedical.infra;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import made.hospital.dossiermedical.domaine.Ordonnance;

public interface OrdonnanceRepository extends JpaRepository<Ordonnance, UUID> 
{
}
