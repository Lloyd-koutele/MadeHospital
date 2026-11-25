package made.hospital.servicehospitalier.application;

/**
 * Action refusée parce que le médecin n'appartient pas au service concerné (réponse HTTP 403).
 */
public class ServiceRefuseException extends RuntimeException
{

    public ServiceRefuseException(String message)
    {
        super(message);
    }
}
