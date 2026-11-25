package made.hospital.dossiermedical.infra;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

import made.hospital.dossiermedical.domaine.Consultation;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {}
