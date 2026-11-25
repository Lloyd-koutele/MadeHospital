package made.hospital.etablissement.api;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import made.hospital.commun.exception.BusinessException;
import made.hospital.etablissement.application.EtablissementService;
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Identité de l'hôpital : lecture publique (pages d'accueil et de connexion), modification par l'administrateur.
 */
@Tag(name = "Établissement", description = "Nom et symbole de l'hôpital")
@RestController
public class EtablissementController
{

    private final EtablissementService service;

    public EtablissementController(EtablissementService service)
    {
        this.service = service;
    }

    @Operation(summary = "Identité de l'hôpital (publique)")
    @GetMapping("/api/etablissement")
    public EtablissementService.Identite identite()
    {
        return service.identite();
    }

    @Operation(summary = "Symbole de l'hôpital (image PNG, publique)")
    @GetMapping(value = "/api/etablissement/logo", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> logo()
    {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.IMAGE_PNG)
                .body(service.logo());
    }

    @Operation(summary = "Configurer le nom et le symbole de l'hôpital (administrateur)")
    @PutMapping(value = "/api/admin/etablissement", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public EtablissementService.Identite configurer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                    @RequestParam String nom,
                                                    @RequestParam(defaultValue = "RONDE") String forme,
                                                    @RequestParam(defaultValue = "false") boolean parDefaut,
                                                    @RequestParam(required = false) MultipartFile logo)
    {
        try
        {
            byte[] image = logo == null || logo.isEmpty() ? null : logo.getBytes();
            return service.configurer(nom, forme, image, parDefaut);
        }
        catch (IOException e)
        {
            throw new BusinessException("Lecture de l'image impossible.");
        }
    }
}
