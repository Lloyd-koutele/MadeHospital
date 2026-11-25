package made.hospital.servicehospitalier.infra;

import java.time.LocalDate;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

/**
 * Contrôle quotidien : un médecin actif sans aucun service actif ne peut plus rien consulter ni créer.
 * Les administrateurs en sont prévenus une fois par jour et par médecin.
 */
@Component
public class ControleAffectationsTask
{

    private final MedecinRepository medecinRepository;
    private final ServiceHospitalierRepository serviceRepository;
    private final Notifier notifier;

    public ControleAffectationsTask(MedecinRepository medecinRepository, ServiceHospitalierRepository serviceRepository,
                                    Notifier notifier)
    {
        this.serviceRepository = serviceRepository;
        this.medecinRepository = medecinRepository;
        this.notifier = notifier;
    }

    @Scheduled(cron = "0 30 7 * * ?")
    @Transactional(readOnly = true)
    public void signalerMedecinsSansService()
    {
        LocalDate aujourdHui = LocalDate.now();
        for (MedecinEntite medecin : medecinRepository.findAll())
        {
            boolean sansServiceActif = medecin.getServices().stream().noneMatch(s -> s.isActif());
            if (medecin.isActif() && sansServiceActif)
            {
                notifier.notifierAdministrateurs(TypeNotification.MEDECIN_SANS_SERVICE,
                        "Médecin sans service",
                        "Dr " + medecin.getPrenom() + " " + medecin.getNom()
                                + " n'est rattaché(e) à aucun service actif et ne peut rien consulter.",
                        "/admin", "sans-service-" + medecin.getId() + "-" + aujourdHui);
            }
        }
    }

    /** Chaque jour à 7 h 45 : services actifs avec des médecins mais sans chef de service. */
    @Scheduled(cron = "0 45 7 * * ?")
    @Transactional(readOnly = true)
    public void signalerServicesSansChef()
    {
        LocalDate aujourdHui = LocalDate.now();
        for (ServiceHospitalier service : serviceRepository.findAll())
        {
            if (service.isActif() && service.getChefId() == null && !medecinRepository.findByServices_Id(service.getId()).isEmpty())
            {
                notifier.notifierAdministrateurs(TypeNotification.SERVICE_SANS_CHEF, "Service sans chef",
                        "Le service " + service.getNom() + " n'a pas de chef de service : personne ne peut gérer ses modèles de documents.",
                        "/admin", "sans-chef-" + service.getId() + "-" + aujourdHui);
            }
        }
    }
}
