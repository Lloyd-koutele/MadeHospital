package made.hospital.utilisateur.infra;

import java.util.List;
import java.util.Optional;

import made.hospital.utilisateur.domaine.Role;
import made.hospital.utilisateur.domaine.User;

import org.springframework.data.jpa.repository.JpaRepository;

// import org.springframework.data.rest.core.annotation.RepositoryRestResource;

 // @RepositoryRestResource(exported = false)
public interface UserRepository extends JpaRepository<User, Long>
{
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndRoles (String email, Role roles);
    boolean existsByEmail(String email);

    List<User> findByRoles(Role roles);

    List<User> findByActif(boolean actif);

    Optional<User> findById(Long userId);
}