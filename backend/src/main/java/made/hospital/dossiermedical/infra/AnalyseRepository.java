package made.hospital.dossiermedical.infra;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import made.hospital.dossiermedical.domaine.Analyses;

@Repository
public interface AnalyseRepository extends JpaRepository<Analyses, UUID> 
{}