package made.hospital.document.application;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.autorisation.application.AutorisationService;
import made.hospital.commun.exception.BusinessException;
import made.hospital.document.domaine.Sejour;
import made.hospital.document.infra.SejourRepository;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

/**
 * Séjours hospitaliers : admission dans un service du médecin, puis sortie.
 */
@Service
public class SejourService
{

    private final SejourRepository sejours;
    private final Numerotation numerotation;
    private final AutorisationService autorisations;
    private final ServiceHospitalierService services;
    private final DocumentService documents;

    public SejourService(SejourRepository sejours, Numerotation numerotation, AutorisationService autorisations,
                         ServiceHospitalierService services, DocumentService documents)
    {
        this.sejours = sejours;
        this.numerotation = numerotation;
        this.autorisations = autorisations;
        this.services = services;
        this.documents = documents;
    }

    public record SejourDto(UUID id, String numero, Long serviceId, String serviceNom, String lit, String motif,
                            String medecinNom, String dateEntree, String dateSortie, boolean enCours)
    {
        static SejourDto depuis(Sejour s)
        {
            return new SejourDto(s.getId(), s.getNumero(), s.getServiceId(), s.getServiceNom(), s.getLit(), s.getMotif(),
                    s.getMedecinNom(), s.getDateEntree().toString(),
                    s.getDateSortie() == null ? null : s.getDateSortie().toString(), s.estEnCours());
        }
    }

    @Transactional(readOnly = true)
    public List<SejourDto> lister(UserDetailsImpl medecin, int patientId)
    {
        exigerAcces(medecin, patientId);
        return sejours.findByPatientIdOrderByDateEntreeDesc(patientId).stream().map(SejourDto::depuis).toList();
    }

    /** Séjours du patient connecté (lecture seule, depuis son dossier). */
    @Transactional(readOnly = true)
    public List<SejourDto> mesSejours(UserDetailsImpl patient)
    {
        return sejours.findByPatientIdOrderByDateEntreeDesc(documents.patientConnecte(patient).getId()).stream().map(SejourDto::depuis).toList();
    }

    @Transactional
    public SejourDto admettre(UserDetailsImpl medecin, int patientId, Long serviceId, String lit, String motif,
                             LocalDateTime dateEntree)
    {
        exigerAcces(medecin, patientId);
        ServiceHospitalier service = services.serviceDeTravail(medecin, serviceId);
        if (sejours.existsByPatientIdAndDateSortieIsNull(patientId))
        {
            throw new BusinessException("Ce patient a déjà un séjour en cours : déclarez d'abord sa sortie.");
        }
        LocalDateTime entree = dateEntree == null ? LocalDateTime.now() : dateEntree;
        if (entree.isAfter(LocalDateTime.now().plusHours(1)))
        {
            throw new BusinessException("La date d'entrée ne peut pas être dans le futur.");
        }
        Sejour sejour = new Sejour();
        sejour.setNumero(numerotation.prochain("SEJ"));
        sejour.setPatientId(patientId);
        sejour.setServiceId(service.getId());
        sejour.setServiceNom(service.getNom());
        sejour.setLit(lit == null || lit.isBlank() ? null : StructureDocument.limiter(lit.trim(), 30));
        sejour.setMotif(motif == null || motif.isBlank() ? null : StructureDocument.limiter(motif.trim(), 500));
        sejour.setMedecinId(medecin.getId());
        sejour.setMedecinNom(documents.nomMedecin(medecin.getId()));
        sejour.setDateEntree(entree.withNano(0));
        return SejourDto.depuis(sejours.save(sejour));
    }

    @Transactional
    public SejourDto sortie(UserDetailsImpl medecin, UUID id, LocalDateTime dateSortie)
    {
        Sejour sejour = sejours.findById(id).orElseThrow(() -> new BusinessException("Séjour introuvable."));
        exigerAcces(medecin, sejour.getPatientId());
        if (!services.idsServicesDuMedecin(medecin).contains(sejour.getServiceId()))
        {
            throw new DocumentService.AccesDocumentRefuse("Ce séjour appartient à un service auquel vous n'êtes pas affecté.");
        }
        if (!sejour.estEnCours())
        {
            throw new BusinessException("La sortie de ce séjour est déjà enregistrée.");
        }
        LocalDateTime sortie = dateSortie == null ? LocalDateTime.now() : dateSortie;
        if (sortie.isBefore(sejour.getDateEntree()))
        {
            throw new BusinessException("La sortie ne peut pas précéder l'entrée.");
        }
        sejour.setDateSortie(sortie.withNano(0));
        return SejourDto.depuis(sejour);
    }

    private void exigerAcces(UserDetailsImpl medecin, int patientId)
    {
        if (!autorisations.verifierAccesMedecin(medecin, patientId))
        {
            throw new DocumentService.AccesDocumentRefuse("Vous n'avez pas accès au dossier de ce patient.");
        }
    }
}
