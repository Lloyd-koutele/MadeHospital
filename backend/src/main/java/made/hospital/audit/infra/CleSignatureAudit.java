package made.hospital.audit.infra;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Paire de clés Ed25519 qui signe les empreintes du journal d'audit.
 * Générée au premier démarrage dans le dossier AUDIT_CLES_DIR (volume Docker dédié, hors base) ;
 * la clé privée ne quitte jamais ce dossier, la clé publique permet de vérifier le journal hors de l'application.
 */
@Component
public class CleSignatureAudit
{

    private static final Logger LOG = LoggerFactory.getLogger(CleSignatureAudit.class);
    private static final String ALGORITHME = "Ed25519";

    private final Path dossier;
    private PrivateKey clePrivee;
    private PublicKey clePublique;

    public CleSignatureAudit(@Value("${app.audit.cles-dir:audit-cles}") String dossier)
    {
        this.dossier = Path.of(dossier);
    }

    @PostConstruct
    public void charger() throws IOException, GeneralSecurityException
    {
        Path privee = dossier.resolve("audit-ed25519.key");
        Path publique = dossier.resolve("audit-ed25519.pub");
        KeyFactory fabrique = KeyFactory.getInstance(ALGORITHME);
        if (Files.exists(privee) && Files.exists(publique))
        {
            clePrivee = fabrique.generatePrivate(new PKCS8EncodedKeySpec(lireBase64(privee)));
            clePublique = fabrique.generatePublic(new X509EncodedKeySpec(lireBase64(publique)));
            LOG.info("Clé de signature du journal d'audit chargée depuis {}", dossier.toAbsolutePath());
            return;
        }
        Files.createDirectories(dossier);
        KeyPair paire = KeyPairGenerator.getInstance(ALGORITHME).generateKeyPair();
        clePrivee = paire.getPrivate();
        clePublique = paire.getPublic();
        ecrireBase64(privee, clePrivee.getEncoded());
        ecrireBase64(publique, clePublique.getEncoded());
        try
        {
            Files.setPosixFilePermissions(privee, PosixFilePermissions.fromString("rw-------"));
        }
        catch (UnsupportedOperationException e)
        {
            // système de fichiers sans permissions POSIX
        }
        LOG.warn("Nouvelle clé de signature du journal d'audit générée dans {} : sauvegardez ce dossier.", dossier.toAbsolutePath());
    }

    public String signer(String empreinte)
    {
        try
        {
            Signature signature = Signature.getInstance(ALGORITHME);
            signature.initSign(clePrivee);
            signature.update(empreinte.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature.sign());
        }
        catch (GeneralSecurityException e)
        {
            throw new IllegalStateException("Signature du journal d'audit impossible", e);
        }
    }

    public boolean verifier(String empreinte, String signatureBase64)
    {
        try
        {
            Signature signature = Signature.getInstance(ALGORITHME);
            signature.initVerify(clePublique);
            signature.update(empreinte.getBytes(StandardCharsets.UTF_8));
            return signature.verify(Base64.getDecoder().decode(signatureBase64));
        }
        catch (GeneralSecurityException | IllegalArgumentException e)
        {
            return false;
        }
    }

    public String clePubliqueBase64()
    {
        return Base64.getEncoder().encodeToString(clePublique.getEncoded());
    }

    private static byte[] lireBase64(Path fichier) throws IOException
    {
        return Base64.getDecoder().decode(Files.readString(fichier).trim());
    }

    private static void ecrireBase64(Path fichier, byte[] contenu) throws IOException
    {
        Files.writeString(fichier, Base64.getEncoder().encodeToString(contenu));
    }
}
