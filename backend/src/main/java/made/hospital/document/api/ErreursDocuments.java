package made.hospital.document.api;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import made.hospital.document.application.DocumentService;

/** Refus d'accès aux documents : 403 avec un message lisible. */
@RestControllerAdvice(assignableTypes = {DocumentController.class, ModeleController.class})
public class ErreursDocuments
{

    @ExceptionHandler(DocumentService.AccesDocumentRefuse.class)
    public ResponseEntity<Map<String, String>> refuse(DocumentService.AccesDocumentRefuse e)
    {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
    }
}
