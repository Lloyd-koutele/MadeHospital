package made.hospital.securite.application;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService
{

    public static final String PREFIX = "Bearer ";

    private final Key key;
    private final long expirationMs;

    /**
     * La clé vient de jwt.secret (variable JWT_SECRET, au moins 32 caractères) pour que les jetons
     * restent valides après un redémarrage. Sans secret configuré, une clé aléatoire est générée à
     * chaque démarrage (comportement d'origine, pratique en développement).
     */
    public JwtService(@Value("${jwt.secret:}") String secret, @Value("${jwt.expiration:86400000}") long expirationMs)
    {
        if (secret == null || secret.isBlank())
        {
            this.key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        }
        else
        {
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }
        this.expirationMs = expirationMs;
    }

    // Générer un token JWT
    public String generateToken(String username, String role)
    {
        return PREFIX + Jwts.builder()
                .setSubject(username)   
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    // Extraire l'email (username) depuis le token
    public String extractUsername(String token)
    {
        return extractClaim(token, Claims::getSubject);
    }

    // Extraire n'importe quelle info du token
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver)
    {
        final Claims claims = parseToken(token);
        return claimsResolver.apply(claims);
    }

    // Vérifier validité du token
    public boolean isTokenValid(String token, String userEmail)
    {
        final String username = extractUsername(token);
        return username.equals(userEmail) && !isTokenExpired(token);
    }

    // Vérifie si le token est expiré
    private boolean isTokenExpired(String token)
    {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token)
    {
        return extractClaim(token, Claims::getExpiration);
    }

    // Supprime le préfixe Bearer et décode le token
    private Claims parseToken(String token)
    {
        if (token.startsWith(PREFIX))
        {
            token = token.replace(PREFIX, "");
        }
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
