package made.hospital.document.application;

import java.time.Year;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import made.hospital.document.domaine.CompteurDocument;
import made.hospital.document.infra.CompteurDocumentRepository;

/**
 * Numéros chronologiques par préfixe et par année (ex. ORD-2026-000123), sans doublon :
 * le compteur est verrouillé en base le temps de la transaction.
 */
@Component
public class Numerotation
{

    private final CompteurDocumentRepository compteurs;

    public Numerotation(CompteurDocumentRepository compteurs)
    {
        this.compteurs = compteurs;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String prochain(String prefixe)
    {
        int annee = Year.now().getValue();
        String cle = prefixe + "-" + annee;
        CompteurDocument compteur = compteurs.verrouiller(cle)
                .orElseGet(() -> compteurs.saveAndFlush(new CompteurDocument(cle)));
        compteur.setValeur(compteur.getValeur() + 1);
        return String.format("%s-%d-%06d", prefixe, annee, compteur.getValeur());
    }
}
