package made.hospital.etablissement.infra;

import org.springframework.data.jpa.repository.JpaRepository;

import made.hospital.etablissement.domaine.ParametresEtablissement;

public interface ParametresEtablissementRepository extends JpaRepository<ParametresEtablissement, Long>
{
}
