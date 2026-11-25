package made.hospital.rendezvous.application;

import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.rendezvous.domaine.RendezVous;

/**
 * Textes et destinataires des notifications liées aux rendez-vous.
 * Le motif n'est pas repris dans les notifications du patient (il peut être médical).
 */
@Component
public class NotificationsRendezVous
{

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");
    private static final String LIEN_PATIENT = "/patient/rendez-vous";
    private static final String LIEN_MEDECIN = "/medecin/rendez-vous";

    private final Notifier notifier;

    public NotificationsRendezVous(Notifier notifier)
    {
        this.notifier = notifier;
    }

    public void planifie(RendezVous rdv)
    {
        notifier.notifierParEmail(rdv.getPatient().getEmail(), TypeNotification.RDV_PLANIFIE,
                "Nouveau rendez-vous",
                "Un rendez-vous est prévu le " + quand(rdv) + " avec " + medecin(rdv) + ".", LIEN_PATIENT);
    }

    public void confirme(RendezVous rdv)
    {
        notifier.notifierParEmail(rdv.getPatient().getEmail(), TypeNotification.RDV_CONFIRME,
                "Rendez-vous confirmé",
                "Votre rendez-vous du " + quand(rdv) + " avec " + medecin(rdv) + " est confirmé.", LIEN_PATIENT);
    }

    public void reporte(RendezVous rdv)
    {
        notifier.notifierParEmail(rdv.getPatient().getEmail(), TypeNotification.RDV_REPORTE,
                "Rendez-vous reporté",
                "Votre rendez-vous avec " + medecin(rdv) + " est reporté au " + quand(rdv) + ".", LIEN_PATIENT);
    }

    /** Annulation : le patient est prévenu si le médecin annule, le médecin si le patient annule. */
    public void annule(RendezVous rdv, boolean parLePatient)
    {
        if (parLePatient)
        {
            notifier.notifier(rdv.getMedecin().getId(), TypeNotification.RDV_ANNULE,
                    "Rendez-vous annulé par le patient",
                    patient(rdv) + " a annulé son rendez-vous du " + quand(rdv) + ". Le créneau est libéré.", LIEN_MEDECIN);
        }
        else
        {
            notifier.notifierParEmail(rdv.getPatient().getEmail(), TypeNotification.RDV_ANNULE,
                    "Rendez-vous annulé",
                    "Votre rendez-vous du " + quand(rdv) + " avec " + medecin(rdv) + " est annulé.", LIEN_PATIENT);
        }
    }

    /** Rappel envoyé au patient la veille. */
    public void rappel(RendezVous rdv)
    {
        notifier.notifierParEmail(rdv.getPatient().getEmail(), TypeNotification.RDV_RAPPEL,
                "Rappel de rendez-vous",
                "Rappel : rendez-vous le " + quand(rdv) + " avec " + medecin(rdv) + ".", LIEN_PATIENT);
    }

    private static String quand(RendezVous rdv)
    {
        return rdv.getDateHeure().format(DATE);
    }

    private static String medecin(RendezVous rdv)
    {
        return "Dr " + rdv.getMedecin().getPrenom() + " " + rdv.getMedecin().getNom();
    }

    private static String patient(RendezVous rdv)
    {
        return rdv.getPatient().getPrenom() + " " + rdv.getPatient().getNom();
    }
}
