package made.hospital.utilisateur.infra;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import made.hospital.utilisateur.domaine.AdminEntite;
import made.hospital.utilisateur.domaine.Role;

/**
 * Repository pour la gestion des administrateurs
 */
@Repository
public interface AdminRepository extends JpaRepository<AdminEntite, Long> {
    
    /**
     * Trouve un administrateur par son email
     */
    Optional<AdminEntite> findByEmail(String email);
    
    /**
     * Trouve un administrateur par son ID et vérifie son rôle
     */
    @Query("SELECT a FROM AdminEntite a WHERE a.id = :id AND a.roles = :role")
    Optional<AdminEntite> findByIdAndRole(@Param("id") Long id, @Param("role") Role role);
    
    /**
     * Trouve tous les administrateurs actifs
     */
    @Query("SELECT a FROM AdminEntite a WHERE a.actif = true")
    List<AdminEntite> findAllActifs();
    
    /**
     * Trouve tous les administrateurs par département
     */
    List<AdminEntite> findByDepartement(String departement);
}
