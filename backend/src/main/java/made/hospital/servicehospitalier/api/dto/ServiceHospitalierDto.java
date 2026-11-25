package made.hospital.servicehospitalier.api.dto;

import java.util.List;

import made.hospital.servicehospitalier.domaine.ServiceHospitalier;

/**
 * Service tel qu'il est renvoyé par l'API (avec les médecins affectés pour l'administration).
 */
public record ServiceHospitalierDto(
        Long id,
        String nom,
        String code,
        String description,
        boolean actif,
        List<Long> medecinIds,
        Long chefId)
{

    public static ServiceHospitalierDto depuis(ServiceHospitalier service, List<Long> medecinIds)
    {
        return new ServiceHospitalierDto(service.getId(), service.getNom(), service.getCode(),
                service.getDescription(), service.isActif(), medecinIds, service.getChefId());
    }

    /** Requête de création ou de modification d'un service (le code est généré par le serveur). */
    public record Requete(String nom, String description)
    {
    }

    /** Requête d'affectation : liste complète des médecins du service. */
    public record Affectation(List<Long> medecinIds)
    {
    }

    /** Désignation du chef de service (null pour retirer le chef). */
    public record Chef(Long medecinId)
    {
    }

    /** Requête d'activation ou de désactivation. */
    public record Statut(boolean actif)
    {
    }
}
