package made.hospital.rendezvous.infra;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.rendezvous.application.NotificationsRendezVous;
import made.hospital.rendezvous.application.RendezVousService;
import made.hospital.rendezvous.domaine.RendezVous;
import made.hospital.rendezvous.domaine.RendezVous.StatutRendezVous;

/**
 * Tâches planifiées des rendez-vous : mise à jour des rendez-vous passés, rappels de la veille,
 * notifications restées en attente et programme du jour des médecins.
 */
@Component
public class RendezVousCleanupTask
{

    private static final Logger LOG = LoggerFactory.getLogger(RendezVousCleanupTask.class);
    private static final List<StatutRendezVous> ACTIFS =
            List.of(StatutRendezVous.PLANIFIE, StatutRendezVous.CONFIRME, StatutRendezVous.REPORTE);

    @Autowired
    private RendezVousService rendezVousService;

    @Autowired
    private RendezVousRepository rendezVousRepository;

    @Autowired
    private NotificationsRendezVous notificationsRendezVous;

    @Autowired
    private Notifier notifier;

    /** Tous les jours à minuit : mise à jour du statut des rendez-vous passés. */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void mettreAJourRendezVousPasses()
    {
        rendezVousService.mettreAJourRendezVousPasses();
    }

    /** Toutes les heures : rappel au patient pour les rendez-vous des 24 prochaines heures. */
    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void envoyerRappelsRendezVous()
    {
        for (RendezVous rendezVous : rendezVousService.getRendezVousNecessitantRappel())
        {
            try
            {
                notificationsRendezVous.rappel(rendezVous);
                rendezVousService.marquerRappelEnvoye(rendezVous.getId());
            }
            catch (RuntimeException e)
            {
                LOG.error("Rappel non envoyé pour le rendez-vous {} : {}", rendezVous.getId(), e.getMessage());
            }
        }
    }

    /**
     * Toutes les 15 minutes : filet de sécurité pour les rendez-vous qui n'auraient pas été notifiés
     * à leur création (ils le sont normalement immédiatement).
     */
    @Scheduled(cron = "0 0/15 * * * ?")
    @Transactional
    public void envoyerNotificationsRendezVous()
    {
        for (RendezVous rendezVous : rendezVousService.getRendezVousNecessitantNotification())
        {
            try
            {
                notificationsRendezVous.planifie(rendezVous);
                rendezVousService.marquerNotificationEnvoyee(rendezVous.getId());
            }
            catch (RuntimeException e)
            {
                LOG.error("Notification non envoyée pour le rendez-vous {} : {}", rendezVous.getId(), e.getMessage());
            }
        }
    }

    /** Chaque jour à 7 h : programme du jour envoyé à chaque médecin qui a des rendez-vous. */
    @Scheduled(cron = "0 0 7 * * ?")
    @Transactional(readOnly = true)
    public void envoyerProgrammeDuJour()
    {
        LocalDate aujourdHui = LocalDate.now();
        List<RendezVous> duJour = rendezVousRepository.findByDateHeureBetweenAndStatutInOrderByDateHeureAsc(
                aujourdHui.atStartOfDay(), aujourdHui.plusDays(1).atStartOfDay(), ACTIFS);

        Map<Long, List<RendezVous>> parMedecin = new LinkedHashMap<>();
        for (RendezVous r : duJour)
        {
            parMedecin.computeIfAbsent(r.getMedecin().getId(), id -> new java.util.ArrayList<>()).add(r);
        }
        DateTimeFormatter heure = DateTimeFormatter.ofPattern("HH:mm");
        parMedecin.forEach((medecinId, liste) -> {
            String premier = liste.get(0).getDateHeure().format(heure);
            notifier.notifierUneFois(medecinId, "programme-" + aujourdHui, TypeNotification.RDV_PROGRAMME_DU_JOUR,
                    "Programme du jour",
                    liste.size() + " rendez-vous aujourd'hui, le premier à " + premier + ".",
                    "/medecin/rendez-vous");
        });
    }
}
