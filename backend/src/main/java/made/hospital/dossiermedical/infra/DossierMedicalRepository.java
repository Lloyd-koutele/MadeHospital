package made.hospital.dossiermedical.infra;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import made.hospital.dossiermedical.domaine.DossierMedical;

public interface DossierMedicalRepository extends JpaRepository<DossierMedical, UUID> 
{}
