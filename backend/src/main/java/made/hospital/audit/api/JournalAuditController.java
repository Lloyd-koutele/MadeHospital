package made.hospital.audit.api;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import made.hospital.audit.application.ConsultationJournalService;
import made.hospital.audit.application.ConsultationJournalService.Filtres;
import made.hospital.audit.application.JournalAuditService;
import made.hospital.audit.application.VerificationAudit;
import made.hospital.audit.domaine.EntreeAudit;
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Journal d'audit : consultation, vérification et export, réservés aux administrateurs.
 * Aucune route ne permet de modifier ou de supprimer une entrée.
 */
@Tag(name = "Journal d'audit", description = "Journal chaîné et signé, accessible aux administrateurs uniquement")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class JournalAuditController
{

    private final JournalAuditService journal;
    private final ConsultationJournalService consultation;

    public JournalAuditController(JournalAuditService journal, ConsultationJournalService consultation)
    {
        this.journal = journal;
        this.consultation = consultation;
    }

    public record EntreeDto(Long sequence, String horodatage, String acteurEmail, String acteurRole, String action,
                            String libelle, String methodeHttp, String chemin, String ressourceId, Integer patientId,
                            String resultat, Integer codeHttp, String adresseIp, String details,
                            String empreintePrecedente, String empreinte, String signature)
    {
        static EntreeDto depuis(EntreeAudit e)
        {
            return new EntreeDto(e.getSequence(), e.getHorodatage().toString(), e.getActeurEmail(), e.getActeurRole(),
                    e.getAction(), e.getLibelle(), e.getMethodeHttp(), e.getChemin(), e.getRessourceId(), e.getPatientId(),
                    e.getResultat().name(), e.getCodeHttp(), e.getAdresseIp(), e.getDetails(),
                    e.getEmpreintePrecedente(), e.getEmpreinte(), e.getSignature());
        }
    }

    public record PageDto(List<EntreeDto> entrees, int page, int taille, long total, int pages)
    {
    }

    @Operation(summary = "Rechercher dans le journal (du plus récent au plus ancien)")
    @GetMapping
    public PageDto rechercher(@AuthenticationPrincipal UserDetailsImpl currentUser,
                              @RequestParam(required = false) String acteur,
                              @RequestParam(required = false) String action,
                              @RequestParam(required = false) Integer patientId,
                              @RequestParam(required = false) EntreeAudit.Resultat resultat,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "25") int taille)
    {
        Page<EntreeAudit> resultats = consultation.rechercher(new Filtres(acteur, action, patientId, resultat, du, au), page, taille);
        return new PageDto(resultats.getContent().stream().map(EntreeDto::depuis).toList(),
                resultats.getNumber(), resultats.getSize(), resultats.getTotalElements(), resultats.getTotalPages());
    }

    @Operation(summary = "Codes d'action présents dans le journal")
    @GetMapping("/actions")
    public List<String> actions(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return consultation.actionsConnues();
    }

    @Operation(summary = "Vérifier l'intégrité de toute la chaîne (empreintes, chaînage, signatures)")
    @GetMapping("/verification")
    public VerificationAudit verifier(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return journal.verifier();
    }

    @Operation(summary = "Clé publique Ed25519 (X.509, base64) pour vérifier les signatures hors de l'application")
    @GetMapping("/cle-publique")
    public Map<String, String> clePublique(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return Map.of("algorithme", "Ed25519", "format", "X.509 / base64", "cle", journal.clePublique());
    }

    @Operation(summary = "Exporter les entrées filtrées au format CSV")
    @GetMapping("/export")
    public ResponseEntity<byte[]> exporter(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                           @RequestParam(required = false) String acteur,
                                           @RequestParam(required = false) String action,
                                           @RequestParam(required = false) Integer patientId,
                                           @RequestParam(required = false) EntreeAudit.Resultat resultat,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au)
    {
        String csv = consultation.exporterCsv(new Filtres(acteur, action, patientId, resultat, du, au));
        String nom = "journal-audit-" + LocalDate.now(ConsultationJournalService.FUSEAU).format(DateTimeFormatter.ISO_DATE) + ".csv";
        // BOM UTF-8 pour que les tableurs affichent correctement les accents
        byte[] contenu = ("﻿" + csv).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nom + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(contenu);
    }
}
