package made.hospital.commun.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Origines autorisées : propriété app.cors.allowed-origins (variable APP_CORS_ORIGINS)
        config.setAllowedOrigins(allowedOrigins);

        // Autorise tous les en-têtes
        config.addAllowedHeader("*");

        // Autorise toutes les méthodes HTTP : GET, POST, etc.
        config.addAllowedMethod("*");

        // Autorise les cookies et headers d'authentification
        config.setAllowCredentials(true);

        // Applique cette config à toutes les routes
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
