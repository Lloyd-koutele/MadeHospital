package made.hospital.document.application;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import made.hospital.document.domaine.DocumentMedical;
import made.hospital.document.domaine.TypeDocument;
import made.hospital.document.infra.DocumentMedicalRepository;
import made.hospital.dossiermedical.domaine.Analyses;
import made.hospital.dossiermedical.domaine.Consultation;
import made.hospital.dossiermedical.domaine.Ordonnance;
import made.hospital.dossiermedical.infra.AnalyseRepository;
import made.hospital.dossiermedical.infra.OrdonnanceRepository;

/**
 * Au démarrage : reprend les ordonnances et analyses de l'ancien dossier dans les documents médicaux.
 * Elles sont marquées « ancien dossier » (non signées) et ne sont reprises qu'une fois (champ origine).
 * Les anciennes données ne sont ni modifiées ni supprimées.
 */
@Component
public class RepriseAnciensDocuments
{

    private static final Logger LOG = LoggerFactory.getLogger(RepriseAnciensDocuments.class);

    private static final String STRUCTURE_ORDONNANCE = """
            {"libre":false,"sections":[{"titre":"Prescription","blocs":[
            {"type":"CHAMP","cle":"medicaments","libelle":"Médicaments","champ":"TEXTE_LONG","obligatoire":false},
            {"type":"CHAMP","cle":"posologie","libelle":"Posologie","champ":"TEXTE_LONG","obligatoire":false},
            {"type":"CHAMP","cle":"instructions","libelle":"Instructions","champ":"TEXTE_LONG","obligatoire":false}]}]}""";

    private static final String STRUCTURE_ANALYSE = """
            {"libre":false,"sections":[{"titre":"Analyse","blocs":[
            {"type":"CHAMP","cle":"analyse","libelle":"Analyse","champ":"TEXTE_COURT","obligatoire":false},
            {"type":"CHAMP","cle":"laboratoire","libelle":"Laboratoire","champ":"TEXTE_COURT","obligatoire":false},
            {"type":"CHAMP","cle":"resultat","libelle":"Résultat","champ":"TEXTE_LONG","obligatoire":false}]}]}""";

    private final OrdonnanceRepository ordonnances;
    private final AnalyseRepository analyses;
    private final DocumentMedicalRepository documents;
    private final StructureDocument structure;
    private final ObjectMapper mapper;

    public RepriseAnciensDocuments(OrdonnanceRepository ordonnances, AnalyseRepository analyses,
                                   DocumentMedicalRepository documents, StructureDocument structure, ObjectMapper mapper)
    {
        this.ordonnances = ordonnances;
        this.analyses = analyses;
        this.documents = documents;
        this.structure = structure;
        this.mapper = mapper;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(20)
    @Transactional
    public void reprendre()
    {
        int reprises = 0;
        try
        {
            for (Ordonnance o : ordonnances.findAll())
            {
                String origine = "ordonnance:" + o.getId();
                if (o.getConsultation() == null || documents.existsByOrigine(origine))
                {
                    continue;
                }
                ObjectNode valeurs = mapper.createObjectNode();
                valeurs.put("medicaments", nettoyer(o.getMedicaments()));
                valeurs.put("posologie", nettoyer(o.getPosologie()));
                valeurs.put("instructions", nettoyer(o.getInstructions()));
                if (enregistrer(o.getConsultation(), TypeDocument.ORDONNANCE, "Ordonnance", STRUCTURE_ORDONNANCE, valeurs,
                        o.getNomMedecin() == null ? null : "Dr " + o.getNomMedecin(), o.getDate(), origine))
                {
                    reprises++;
                }
            }
            for (Analyses a : analyses.findAll())
            {
                String origine = "analyse:" + a.getId();
                if (a.getConsultation() == null || documents.existsByOrigine(origine))
                {
                    continue;
                }
                ObjectNode valeurs = mapper.createObjectNode();
                valeurs.put("analyse", nettoyer(a.getTypeAnalyse()));
                valeurs.put("laboratoire", nettoyer(a.getLaboratoire()));
                valeurs.put("resultat", nettoyer(a.getResultat()));
                if (enregistrer(a.getConsultation(), TypeDocument.RESULTAT_EXAMEN, "Résultats d'analyse", STRUCTURE_ANALYSE,
                        valeurs, null, a.getDateAnalyse(), origine))
                {
                    reprises++;
                }
            }
            if (reprises > 0)
            {
                LOG.info("{} document(s) repris de l'ancien dossier médical", reprises);
            }
        }
        catch (RuntimeException e)
        {
            LOG.error("Reprise des anciens documents interrompue : {}", e.getMessage());
        }
    }

    private boolean enregistrer(Consultation consultation, TypeDocument type, String titre, String structureJson,
                                ObjectNode valeurs, String auteur, LocalDateTime date, String origine)
    {
        if (consultation.getDossierMedical() == null || consultation.getDossierMedical().getPatient() == null)
        {
            return false;
        }
        DocumentMedical d = new DocumentMedical();
        d.setType(type);
        d.setTitre(titre);
        d.setPatientId(consultation.getDossierMedical().getPatient().getId());
        if (consultation.getService() != null)
        {
            d.setServiceId(consultation.getService().getId());
            d.setServiceNom(consultation.getService().getNom());
        }
        d.setAuteurNom(auteur);
        d.setStructure(structure.normaliser(structureJson));
        d.setValeurs(structure.ecrire(valeurs));
        d.setStatut(DocumentMedical.Statut.IMPORTE);
        d.setDateCreation(date == null ? LocalDateTime.now() : date);
        d.setOrigine(origine);
        documents.save(d);
        return true;
    }

    private static String nettoyer(String valeur)
    {
        if (valeur == null || valeur.equals("Aucun") || valeur.equals("Aucune"))
        {
            return "";
        }
        return StructureDocument.limiter(valeur, 20000);
    }
}
