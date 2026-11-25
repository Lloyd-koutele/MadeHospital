package made.hospital.audit.api;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import made.hospital.audit.application.AuditRequetes;

/**
 * Trace automatiquement les actions de l'API à la fin de chaque requête, sans code dans les contrôleurs.
 * Les refus levés par la sécurité (AccessDeniedException) sont tracés par le gestionnaire de refus de
 * SecurityConfig, pour ne pas les compter deux fois.
 */
@Configuration
public class IntercepteurAudit implements HandlerInterceptor, WebMvcConfigurer
{

    private final AuditRequetes audit;

    public IntercepteurAudit(AuditRequetes audit)
    {
        this.audit = audit;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry)
    {
        registry.addInterceptor(this).addPathPatterns("/api/**");
    }

    @Override
    public void afterCompletion(HttpServletRequest requete, HttpServletResponse reponse, Object handler, Exception ex)
    {
        if (ex instanceof AccessDeniedException)
        {
            return;
        }
        int statut = ex != null && reponse.getStatus() < 400 ? 500 : reponse.getStatus();
        if (audit.doitTracer(requete, statut))
        {
            audit.tracer(requete, statut, ex != null ? ex.getClass().getSimpleName() : null);
        }
    }
}
