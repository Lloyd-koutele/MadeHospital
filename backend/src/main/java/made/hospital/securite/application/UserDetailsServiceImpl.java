package made.hospital.securite.application;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import made.hospital.utilisateur.infra.UserRepository;

/**
 * Charge un utilisateur par son email et le transforme en {@link UserDetailsImpl}.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService
{

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository)
    {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetailsImpl loadUserByUsername(String email)
    {
        return userRepository.findByEmail(email)
            .map(UserDetailsImpl::depuis)
            .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé : " + email));
    }
}
