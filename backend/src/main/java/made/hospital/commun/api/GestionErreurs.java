package made.hospital.commun.api;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import made.hospital.commun.exception.BusinessException;

/**
 * Erreurs métier et de validation renvoyées au client avec un message lisible (HTTP 400),
 * au lieu d'une erreur serveur générique.
 */
@RestControllerAdvice
public class GestionErreurs
{

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> erreurMetier(BusinessException e)
    {
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> erreurValidation(MethodArgumentNotValidException e)
    {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(erreur -> erreur.getDefaultMessage())
                .findFirst()
                .orElse("Données invalides");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("success", false, "message", message));
    }
}
