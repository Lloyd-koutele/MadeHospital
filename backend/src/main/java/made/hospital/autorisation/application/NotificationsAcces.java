package made.hospital.autorisation.application;

import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import made.hospital.autorisation.domaine.AutorisationAccesPatient;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.notification.application.Notifier;
import made.hospital.notification.domaine.TypeNotification;
import made.hospital.patient.domaine.Patient;

/**
 * Textes et destinataires des notifications liées aux accès aux dossiers médicaux.
 */
@Component
public class NotificationsAcces
{

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final Notifier notifier;

    public NotificationsAcces(Notifier notifier)
    {
        this.notifier = notifier;
    }

    /** Le médecin autorisé est prévenu ; le patient aussi lorsque l'accès vient d'un autre médecin. */
    public void accorde(AutorisationAccesPatient autorisation)
    {
        Patient patient = autorisation.getPatient();
        String expiration = autorisation.getDateExpiration() == null
                ? ""
                : " jusqu'au " + autorisation.getDateExpiration().format(DATE);
        notifier.notifier(autorisation.getMedecinAutorise().getId(), TypeNotification.ACCES_ACCORDE,
                "Accès à un dossier accordé",
                "Vous avez accès au dossier de " + nom(patient) + expiration + ".",
                "/dossier-medical/" + patient.getId());
        if (!autorisation.isAccordeParPatient())
        {
            notifier.notifierParEmail(patient.getEmail(), TypeNotification.ACCES_ACCORDE,
                    "Nouvel accès à votre dossier",
                    medecin(autorisation.getMedecinAutorise()) + " a désormais accès à votre dossier médical.",
                    "/patient/acces");
        }
    }

    public void revoque(AutorisationAccesPatient autorisation)
    {
        notifier.notifier(autorisation.getMedecinAutorise().getId(), TypeNotification.ACCES_REVOQUE,
                "Accès à un dossier retiré",
                "Votre accès au dossier de " + nom(autorisation.getPatient()) + " a été retiré.",
                "/medecin");
    }

    /** Prévient le médecin qu'un accès expire bientôt (une seule fois par autorisation). */
    public void expireBientot(AutorisationAccesPatient autorisation)
    {
        notifier.notifierUneFois(autorisation.getMedecinAutorise().getId(), "acces-expire-" + autorisation.getId(),
                TypeNotification.ACCES_EXPIRE_BIENTOT,
                "Accès bientôt expiré",
                "Votre accès au dossier de " + nom(autorisation.getPatient()) + " expire le "
                        + autorisation.getDateExpiration().format(DATE) + ".",
                "/dossier-medical/" + autorisation.getPatient().getId());
    }

    private static String nom(Patient patient)
    {
        return patient.getPrenom() + " " + patient.getNom();
    }

    private static String medecin(MedecinEntite medecin)
    {
        return "Dr " + medecin.getPrenom() + " " + medecin.getNom();
    }
}
