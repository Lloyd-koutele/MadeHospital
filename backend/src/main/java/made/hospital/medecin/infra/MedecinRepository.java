package made.hospital.medecin.infra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.utilisateur.domaine.Role;

/**
 * Repository pour la gestion des médecins
 */
@Repository
public interface MedecinRepository extends JpaRepository<MedecinEntite, Long> {
    
    /**
     * Trouve un médecin par son email
     */
    Optional<MedecinEntite> findByEmail(String email);

    /**
     * Médecins affectés à un service
     */
    List<MedecinEntite> findByServices_Id(Long serviceId);
    
    /**
     * Trouve un médecin par son numéro d'ordre
     */
    Optional<MedecinEntite> findByNumeroOrdre(String numeroOrdre);
    
    /**
     * Trouve un médecin par son ID utilisateur et son rôle
     */
    @Query("SELECT m FROM MedecinEntite m WHERE m.id = :userId AND m.roles = :role")
    Optional<MedecinEntite> findByUserIdAndRole(@Param("userId") Long userId, @Param("role") Role roles);

    /**
     * Récupère tous les médecins actifs
     */
    List<MedecinEntite> findByActifTrue();
    
    /**
     * Récupère tous les médecins par spécialité
     */
    List<MedecinEntite> findBySpecialite(String specialite);

}
