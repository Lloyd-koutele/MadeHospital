package made.hospital.utilisateur.infra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import made.hospital.utilisateur.domaine.AdminEntite;

/**
 * Crée le premier administrateur au démarrage s'il n'existe pas encore.
 * Ses informations viennent du fichier .env (variables INITIAL_ADMIN_*), jamais du code :
 * sans email ou sans mot de passe configuré, aucun compte n'est créé.
 */
@Component
public class InitialAdminCreator implements CommandLineRunner
{

    private static final Logger logger = LoggerFactory.getLogger(InitialAdminCreator.class);

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.initial-admin.email:}")
    private String email;

    @Value("${app.initial-admin.password:}")
    private String password;

    @Value("${app.initial-admin.nom:Administrateur}")
    private String nom;

    @Value("${app.initial-admin.prenom:Principal}")
    private String prenom;

    @Value("${app.initial-admin.telephone:}")
    private String telephone;

    @Value("${app.initial-admin.departement:Direction}")
    private String departement;

    public InitialAdminCreator(AdminRepository adminRepository, PasswordEncoder passwordEncoder)
    {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args)
    {
        try
        {
            createInitialAdminIfNeeded();
        }
        catch (Exception e)
        {
            logger.error("Erreur lors de la création de l'administrateur initial", e);
        }
    }

    private void createInitialAdminIfNeeded()
    {
        if (email == null || email.isBlank() || password == null || password.isBlank())
        {
            logger.warn("INITIAL_ADMIN_EMAIL ou INITIAL_ADMIN_PASSWORD absent du .env : aucun administrateur initial créé");
            return;
        }
        if (adminRepository.findByEmail(email).isPresent())
        {
            logger.info("L'administrateur initial {} existe déjà", email);
            return;
        }
        AdminEntite admin = new AdminEntite(
            nom,
            prenom,
            email,
            passwordEncoder.encode(password),
            telephone,
            departement
        );
        adminRepository.save(admin);
        logger.info("Administrateur initial {} créé", email);
    }
}
