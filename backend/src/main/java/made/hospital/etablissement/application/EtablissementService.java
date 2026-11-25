package made.hospital.etablissement.application;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Optional;

import javax.imageio.ImageIO;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.commun.exception.BusinessException;
import made.hospital.etablissement.domaine.ParametresEtablissement;
import made.hospital.etablissement.domaine.ParametresEtablissement.FormeLogo;
import made.hospital.etablissement.infra.ParametresEtablissementRepository;

/**
 * Identité de l'hôpital. Le symbole envoyé par l'administrateur est vérifié (vraie image, taille limitée)
 * puis ré-encodé en PNG, ce qui supprime les métadonnées et tout contenu inattendu du fichier.
 */
@Service
public class EtablissementService
{

    public static final String NOM_PAR_DEFAUT = "MadeHospital";
    private static final int TAILLE_MAX_OCTETS = 2 * 1024 * 1024;
    private static final int COTE_MAX = 1024;

    private final ParametresEtablissementRepository repository;
    private byte[] logoParDefaut;

    public EtablissementService(ParametresEtablissementRepository repository)
    {
        this.repository = repository;
    }

    public record Identite(boolean configure, String nom, String forme, boolean logoParDefaut, long version)
    {
    }

    @Transactional(readOnly = true)
    public Identite identite()
    {
        return repository.findById(ParametresEtablissement.IDENTIFIANT)
                .map(p -> new Identite(true, p.getNom(), p.getForme().name(), p.isLogoParDefaut(), p.getVersion()))
                .orElse(new Identite(false, NOM_PAR_DEFAUT, FormeLogo.RONDE.name(), true, 0));
    }

    @Transactional(readOnly = true)
    public boolean estConfigure()
    {
        return repository.existsById(ParametresEtablissement.IDENTIFIANT);
    }

    /** À appeler avant toute création de compte : l'identité doit être configurée d'abord. */
    public void exigerConfiguration()
    {
        if (!estConfigure())
        {
            throw new BusinessException("Configurez d'abord l'identité de l'hôpital (nom et symbole) avant de créer des comptes.");
        }
    }

    /** Logo courant (PNG) : celui de l'hôpital ou le symbole par défaut du logiciel. */
    @Transactional(readOnly = true)
    public byte[] logo()
    {
        Optional<ParametresEtablissement> parametres = repository.findById(ParametresEtablissement.IDENTIFIANT);
        if (parametres.isPresent() && !parametres.get().isLogoParDefaut() && parametres.get().getLogo() != null)
        {
            return parametres.get().getLogo();
        }
        return logoParDefaut();
    }

    @Transactional(readOnly = true)
    public FormeLogo forme()
    {
        return repository.findById(ParametresEtablissement.IDENTIFIANT).map(ParametresEtablissement::getForme).orElse(FormeLogo.RONDE);
    }

    @Transactional(readOnly = true)
    public String nom()
    {
        return identite().nom();
    }

    /**
     * Enregistre l'identité. Sans image (ou avec parDefaut), le symbole par défaut est retenu.
     */
    @Transactional
    public Identite configurer(String nom, String forme, byte[] image, boolean parDefaut)
    {
        String nomPropre = nom == null ? "" : nom.trim();
        if (nomPropre.isEmpty() || nomPropre.length() > 150)
        {
            throw new BusinessException("Le nom de l'hôpital est obligatoire (150 caractères au plus).");
        }
        FormeLogo formeLogo;
        try
        {
            formeLogo = FormeLogo.valueOf(forme == null ? "RONDE" : forme.trim().toUpperCase());
        }
        catch (IllegalArgumentException e)
        {
            throw new BusinessException("Forme de symbole inconnue : choisissez ronde, carrée ou rectangle.");
        }
        ParametresEtablissement parametres = repository.findById(ParametresEtablissement.IDENTIFIANT)
                .orElseGet(ParametresEtablissement::new);
        parametres.setNom(nomPropre);
        parametres.setForme(formeLogo);
        if (parDefaut || image == null || image.length == 0)
        {
            if (parDefaut || parametres.getLogo() == null)
            {
                parametres.setLogo(null);
                parametres.setLogoParDefaut(true);
            }
        }
        else
        {
            parametres.setLogo(reencoder(image));
            parametres.setLogoParDefaut(false);
        }
        parametres.setConfigureLe(Instant.now());
        parametres.setVersion(parametres.getVersion() + 1);
        repository.save(parametres);
        return identite();
    }

    private static byte[] reencoder(byte[] image)
    {
        if (image.length > TAILLE_MAX_OCTETS)
        {
            throw new BusinessException("L'image dépasse 2 Mo.");
        }
        BufferedImage source;
        try
        {
            source = ImageIO.read(new ByteArrayInputStream(image));
        }
        catch (IOException e)
        {
            source = null;
        }
        if (source == null)
        {
            throw new BusinessException("Le fichier envoyé n'est pas une image lisible (PNG ou JPEG).");
        }
        double echelle = Math.min(1.0, (double) COTE_MAX / Math.max(source.getWidth(), source.getHeight()));
        int largeur = Math.max(1, (int) Math.round(source.getWidth() * echelle));
        int hauteur = Math.max(1, (int) Math.round(source.getHeight() * echelle));
        BufferedImage propre = new BufferedImage(largeur, hauteur, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = propre.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(source, 0, 0, largeur, hauteur, null);
        g.dispose();
        try
        {
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            ImageIO.write(propre, "png", sortie);
            return sortie.toByteArray();
        }
        catch (IOException e)
        {
            throw new BusinessException("Impossible d'enregistrer l'image.");
        }
    }

    private synchronized byte[] logoParDefaut()
    {
        if (logoParDefaut == null)
        {
            try (InputStream flux = new ClassPathResource("etablissement/logo-defaut.png").getInputStream())
            {
                logoParDefaut = flux.readAllBytes();
            }
            catch (IOException e)
            {
                logoParDefaut = new byte[0];
            }
        }
        return logoParDefaut;
    }
}
