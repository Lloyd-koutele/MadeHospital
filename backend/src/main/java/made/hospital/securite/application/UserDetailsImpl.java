package made.hospital.securite.application;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import made.hospital.utilisateur.domaine.Role;
import made.hospital.utilisateur.domaine.User;

/**
 * Utilisateur authentifié, tel que Spring Security le place dans le contexte de sécurité.
 * Injecté dans les contrôleurs avec {@code @AuthenticationPrincipal UserDetailsImpl currentUser} :
 * le rôle vient toujours du compte en base, jamais de ce qu'envoie le client.
 */
public class UserDetailsImpl implements UserDetails
{

    private final Long id;
    private final String email;
    private final String password;
    private final Role role;
    private final boolean actif;

    public UserDetailsImpl(Long id, String email, String password, Role role, boolean actif)
    {
        this.id = id;
        this.email = email;
        this.password = password;
        this.role = role;
        this.actif = actif;
    }

    public static UserDetailsImpl depuis(User user)
    {
        return new UserDetailsImpl(user.getId(), user.getEmail(), user.getPassword(), user.getRoles(), user.isActif());
    }

    public Long getId()
    {
        return id;
    }

    public String getEmail()
    {
        return email;
    }

    public Role getRole()
    {
        return role;
    }

    public boolean aLeRole(Role... roles)
    {
        for (Role r : roles)
        {
            if (r == role)
            {
                return true;
            }
        }
        return false;
    }

    public boolean estAdmin()
    {
        return role == Role.ADMIN;
    }

    public boolean estMedecin()
    {
        return role == Role.MEDECIN;
    }

    public boolean estPatient()
    {
        return role == Role.PATIENT;
    }

    public boolean estChercheur()
    {
        return role == Role.CHERCHEUR;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities()
    {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword()
    {
        return password;
    }

    @Override
    public String getUsername()
    {
        return email;
    }

    @Override
    public boolean isAccountNonExpired()
    {
        return true;
    }

    @Override
    public boolean isAccountNonLocked()
    {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired()
    {
        return true;
    }

    @Override
    public boolean isEnabled()
    {
        return actif;
    }
}
