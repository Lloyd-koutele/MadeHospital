package made.hospital.securite.config;


import made.hospital.securite.application.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpMethod;

import made.hospital.securite.application.UserDetailsServiceImpl;

@EnableMethodSecurity(securedEnabled = true, prePostEnabled = true)
@Configuration
@EnableWebSecurity
public class SecurityConfig
{

    private final UserDetailsServiceImpl userDetailsServiceImpl;
    private final JwtService jwtService;
    private final List<String> allowedOrigins;
    private final made.hospital.audit.application.AuditRequetes auditRequetes;

    public SecurityConfig(UserDetailsServiceImpl userDetailsServiceImpl, JwtService jwtService,
                          @Value("${app.cors.allowed-origins}") List<String> allowedOrigins,
                          made.hospital.audit.application.AuditRequetes auditRequetes)
    {
        this.userDetailsServiceImpl = userDetailsServiceImpl;
        this.jwtService = jwtService;
        this.allowedOrigins = allowedOrigins;
        this.auditRequetes = auditRequetes;
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter()
    {
        return new JwtAuthFilter(jwtService, userDetailsService());
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception
    {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(request -> {
                var corsConfig = new CorsConfiguration();
                corsConfig.setAllowedOrigins(allowedOrigins);
                corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                corsConfig.setAllowedHeaders(Arrays.asList("*"));
                corsConfig.setExposedHeaders(Arrays.asList("Authorization"));
                corsConfig.setAllowCredentials(true);
                return corsConfig;
            }))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Déconnexion réussie\"}");
                })
                .invalidateHttpSession(true)
                .clearAuthentication(true))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    // Refus d'accès (rôle insuffisant) : toujours inscrit au journal d'audit
                    auditRequetes.tracer(request, 403, accessDeniedException.getMessage());
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    new AntPathRequestMatcher("/auth/**"),
                    new AntPathRequestMatcher("/login"),
                    new AntPathRequestMatcher("/register"),
                    new AntPathRequestMatcher("/v3/api-docs/**"),
                    new AntPathRequestMatcher("/swagger-ui/**"),
                    new AntPathRequestMatcher("/error"),
                    // Ajouter les mêmes endpoints avec le préfixe /api
                    new AntPathRequestMatcher("/api/login"),
                    new AntPathRequestMatcher("/api/register"),
                    new AntPathRequestMatcher("/api/auth/**"),
                    new AntPathRequestMatcher("/api/logout"),
                    new AntPathRequestMatcher("/api/error")
                ).permitAll()
                // Identité de l'hôpital (logo, nom) et vérification publique des documents (QR code)
                .requestMatchers(new AntPathRequestMatcher("/api/etablissement/**", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/etablissement", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/documents/verifier/**", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/admin/**")).hasAuthority("ROLE_ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/medecin/**")).hasAuthority("ROLE_MEDECIN")
                .requestMatchers(new AntPathRequestMatcher("/api/chercheur/**")).hasAuthority("ROLE_CHERCHEUR")
                .requestMatchers(new AntPathRequestMatcher("/api/patient/**")).hasAnyAuthority("ROLE_PATIENT", "ROLE_MEDECIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService()
    {
        return userDetailsServiceImpl;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider()
    {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider();
        authenticationProvider.setUserDetailsService(userDetailsService());
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        authenticationProvider.setHideUserNotFoundExceptions(false);
        return authenticationProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder()
    {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception
    {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
