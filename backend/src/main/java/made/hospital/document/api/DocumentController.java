package made.hospital.document.api;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import made.hospital.document.application.DocumentService;
import made.hospital.document.application.ModeleService;
import made.hospital.document.application.RenduPdf;
import made.hospital.document.application.SejourService;
import made.hospital.document.domaine.DocumentMedical;
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Documents médicaux et séjours, côté médecin ; documents du patient ; vérification publique par QR code.
 */
@Tag(name = "Documents médicaux", description = "Comptes rendus, ordonnances, examens, hospitalisations")
@SecurityRequirement(name = "bearerAuth")
@RestController
public class DocumentController
{

    private final DocumentService documents;
    private final SejourService sejours;
    private final RenduPdf rendu;

    public DocumentController(DocumentService documents, SejourService sejours, RenduPdf rendu)
    {
        this.documents = documents;
        this.sejours = sejours;
        this.rendu = rendu;
    }

    public record CreationRequete(Long modeleId, Long serviceId, UUID sejourId)
    {
    }

    public record SaisieRequete(String titre, JsonNode valeurs, JsonNode structure)
    {
    }

    public record PropositionRequete(String intitule, String details)
    {
    }

    public record AdmissionRequete(Long serviceId, String lit, String motif, LocalDateTime dateEntree)
    {
    }

    public record SortieRequete(LocalDateTime dateSortie)
    {
    }

    // ---------- Médecin : documents ----------

    @Operation(summary = "Documents d'un patient")
    @GetMapping("/api/medecin/patients/{patientId}/documents")
    @PreAuthorize("hasRole('MEDECIN')")
    public List<DocumentService.DocumentResume> lister(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                       @PathVariable int patientId)
    {
        return documents.lister(currentUser, patientId);
    }

    @Operation(summary = "Créer un document (brouillon) à partir d'un modèle")
    @PostMapping("/api/medecin/patients/{patientId}/documents")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<DocumentService.DocumentDetail> creer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                                @PathVariable int patientId,
                                                                @RequestBody CreationRequete requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documents.creer(currentUser, patientId, requete.modeleId(), requete.serviceId(), requete.sejourId()));
    }

    @Operation(summary = "Documents, images et équipe que l'on peut lier à un document")
    @GetMapping("/api/medecin/patients/{patientId}/references")
    @PreAuthorize("hasRole('MEDECIN')")
    public DocumentService.References references(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                 @PathVariable int patientId,
                                                 @RequestParam(required = false) Long serviceId)
    {
        return documents.references(currentUser, patientId, serviceId);
    }

    @Operation(summary = "Lire un document")
    @GetMapping("/api/medecin/documents/{id}")
    @PreAuthorize("hasRole('MEDECIN')")
    public DocumentService.DocumentDetail lire(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id)
    {
        return documents.lire(currentUser, id);
    }

    @Operation(summary = "Enregistrer la saisie d'un brouillon")
    @PutMapping("/api/medecin/documents/{id}")
    @PreAuthorize("hasRole('MEDECIN')")
    public DocumentService.DocumentDetail enregistrer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                      @PathVariable UUID id, @RequestBody SaisieRequete requete)
    {
        return documents.modifier(currentUser, id, requete.titre(), requete.valeurs(), requete.structure());
    }

    @Operation(summary = "Valider et signer un document")
    @PostMapping("/api/medecin/documents/{id}/valider")
    @PreAuthorize("hasRole('MEDECIN')")
    public DocumentService.DocumentDetail valider(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id)
    {
        return documents.valider(currentUser, id);
    }

    @Operation(summary = "Rectifier un document validé (crée une nouvelle version)")
    @PostMapping("/api/medecin/documents/{id}/rectifier")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<DocumentService.DocumentDetail> rectifier(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                                    @PathVariable UUID id)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(documents.rectifier(currentUser, id));
    }

    @Operation(summary = "Supprimer un brouillon")
    @DeleteMapping("/api/medecin/documents/{id}")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<Void> supprimer(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id)
    {
        documents.supprimerBrouillon(currentUser, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Proposer la structure d'un document libre comme modèle au chef de service")
    @PostMapping("/api/medecin/documents/{id}/proposer-modele")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<ModeleService.DemandeDto> proposer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                             @PathVariable UUID id, @RequestBody PropositionRequete requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documents.proposerCommeModele(currentUser, id, requete.intitule(), requete.details()));
    }

    @Operation(summary = "PDF d'un document")
    @GetMapping("/api/medecin/documents/{id}/pdf")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id)
    {
        return pdf(documents.documentPourPdf(currentUser, id));
    }

    // ---------- Médecin : séjours ----------

    @Operation(summary = "Séjours hospitaliers d'un patient")
    @GetMapping("/api/medecin/patients/{patientId}/sejours")
    @PreAuthorize("hasRole('MEDECIN')")
    public List<SejourService.SejourDto> sejours(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable int patientId)
    {
        return sejours.lister(currentUser, patientId);
    }

    @Operation(summary = "Déclarer l'admission d'un patient")
    @PostMapping("/api/medecin/patients/{patientId}/sejours")
    @PreAuthorize("hasRole('MEDECIN')")
    public ResponseEntity<SejourService.SejourDto> admettre(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                            @PathVariable int patientId, @RequestBody AdmissionRequete requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(sejours.admettre(currentUser, patientId, requete.serviceId(),
                requete.lit(), requete.motif(), requete.dateEntree()));
    }

    @Operation(summary = "Déclarer la sortie d'un patient")
    @PostMapping("/api/medecin/sejours/{id}/sortie")
    @PreAuthorize("hasRole('MEDECIN')")
    public SejourService.SejourDto sortie(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id,
                                          @RequestBody(required = false) SortieRequete requete)
    {
        return sejours.sortie(currentUser, id, requete == null ? null : requete.dateSortie());
    }

    // ---------- Patient ----------

    @Operation(summary = "Mes documents validés")
    @GetMapping("/api/patient/mes-documents")
    @PreAuthorize("hasRole('PATIENT')")
    public List<DocumentService.DocumentResume> mesDocuments(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return documents.mesDocuments(currentUser);
    }

    @Operation(summary = "Mes séjours hospitaliers")
    @GetMapping("/api/patient/mes-sejours")
    @PreAuthorize("hasRole('PATIENT')")
    public List<SejourService.SejourDto> mesSejours(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return sejours.mesSejours(currentUser);
    }

    @Operation(summary = "PDF d'un de mes documents")
    @GetMapping("/api/patient/mes-documents/{id}/pdf")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<byte[]> monPdf(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable UUID id)
    {
        return pdf(documents.monDocument(currentUser, id));
    }

    // ---------- Public ----------

    @Operation(summary = "Vérifier l'authenticité d'un document (QR code), sans donnée patient")
    @GetMapping("/api/documents/verifier/{numero}")
    public DocumentService.Verification verifier(@PathVariable String numero, @RequestParam(name = "e", required = false) String empreinte)
    {
        return documents.verifier(numero, empreinte);
    }

    private ResponseEntity<byte[]> pdf(DocumentMedical document)
    {
        String nom = (document.getNumero() == null ? "brouillon-" + document.getId() : document.getNumero()) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(nom).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(rendu.pdf(document));
    }
}
