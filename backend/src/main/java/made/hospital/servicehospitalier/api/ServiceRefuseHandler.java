package made.hospital.servicehospitalier.api;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import made.hospital.servicehospitalier.application.ServiceRefuseException;

/**
 * Transforme un refus lié aux services (médecin hors du service concerné) en réponse 403 lisible par le client.
 */
@RestControllerAdvice
public class ServiceRefuseHandler
{

    @ExceptionHandler(ServiceRefuseException.class)
    public ResponseEntity<Map<String, Object>> refus(ServiceRefuseException e)
    {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", e.getMessage()));
    }
}
