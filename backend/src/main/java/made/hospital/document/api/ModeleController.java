package made.hospital.document.api;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
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
import made.hospital.securite.application.UserDetailsImpl;

/**
 * Modèles de documents : galerie des médecins, gestion par le chef de service, demandes de modèles.
 */
@Tag(name = "Modèles de documents", description = "Galerie des médecins et gestion par le chef de service")
@SecurityRequirement(name = "bearerAuth")
@RestController
@PreAuthorize("hasRole('MEDECIN')")
public class ModeleController
{

    private final ModeleService modeles;
    private final DocumentService documents;

    public ModeleController(ModeleService modeles, DocumentService documents)
    {
        this.modeles = modeles;
        this.documents = documents;
    }

    public record DemandeRequete(Long serviceId, String intitule, String details)
    {
    }

    public record TraitementRequete(Long modeleId, String reponse, boolean refuser)
    {
    }

    // ---------- Médecin ----------

    @Operation(summary = "Modèles utilisables dans le service actif (favoris et plus utilisés en premier)")
    @GetMapping("/api/medecin/modeles")
    public List<ModeleService.ModeleResume> galerie(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                    @RequestParam(required = false) Long serviceId)
    {
        return modeles.galerie(currentUser, serviceId);
    }

    @Operation(summary = "Détail d'un modèle")
    @GetMapping("/api/medecin/modeles/{id}")
    public ModeleService.ModeleDetail detail(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        return modeles.detail(currentUser, id);
    }

    @Operation(summary = "Ajouter ou retirer un modèle des favoris")
    @PostMapping("/api/medecin/modeles/{id}/favori")
    public Map<String, Boolean> favori(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        return Map.of("favori", modeles.basculerFavori(currentUser, id));
    }

    @Operation(summary = "Demander un modèle au chef de service")
    @PostMapping("/api/medecin/demandes-modeles")
    public ResponseEntity<ModeleService.DemandeDto> demander(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                             @RequestBody DemandeRequete requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(modeles.demander(currentUser,
                documents.nomMedecinPublic(currentUser.getId()), requete.serviceId(), requete.intitule(),
                requete.details(), null));
    }

    // ---------- Chef de service ----------

    @Operation(summary = "Modèles des services dirigés et bibliothèque de l'hôpital")
    @GetMapping("/api/medecin/chef/modeles")
    public List<ModeleService.ModeleResume> modelesDuChef(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return modeles.modelesDuChef(currentUser);
    }

    @Operation(summary = "Créer un modèle (brouillon)")
    @PostMapping("/api/medecin/chef/modeles")
    public ResponseEntity<ModeleService.ModeleDetail> creer(@AuthenticationPrincipal UserDetailsImpl currentUser,
                                                            @RequestBody ModeleService.RequeteModele requete)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(modeles.creer(currentUser, requete));
    }

    @Operation(summary = "Modifier un modèle")
    @PutMapping("/api/medecin/chef/modeles/{id}")
    public ModeleService.ModeleDetail modifier(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id,
                                               @RequestBody ModeleService.RequeteModele requete)
    {
        return modeles.modifier(currentUser, id, requete);
    }

    @Operation(summary = "Archiver un modèle")
    @PostMapping("/api/medecin/chef/modeles/{id}/archiver")
    public ModeleService.ModeleResume archiver(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        return modeles.archiver(currentUser, id);
    }

    @Operation(summary = "Supprimer un brouillon de modèle jamais publié")
    @DeleteMapping("/api/medecin/chef/modeles/{id}")
    public ResponseEntity<Void> supprimer(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        modeles.supprimer(currentUser, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Demandes de modèles des services dirigés")
    @GetMapping("/api/medecin/chef/demandes")
    public List<ModeleService.DemandeDto> demandes(@AuthenticationPrincipal UserDetailsImpl currentUser)
    {
        return modeles.demandesDuChef(currentUser);
    }

    @Operation(summary = "Structure proposée avec une demande (sans donnée patient)")
    @GetMapping("/api/medecin/chef/demandes/{id}/structure")
    public ResponseEntity<JsonNode> structureProposee(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id)
    {
        JsonNode structure = modeles.structureProposee(currentUser, id);
        return structure == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(structure);
    }

    @Operation(summary = "Traiter ou refuser une demande de modèle")
    @PostMapping("/api/medecin/chef/demandes/{id}/traiter")
    public ModeleService.DemandeDto traiter(@AuthenticationPrincipal UserDetailsImpl currentUser, @PathVariable Long id,
                                            @RequestBody TraitementRequete requete)
    {
        return modeles.traiter(currentUser, id, requete.modeleId(), requete.reponse(), requete.refuser());
    }
}
