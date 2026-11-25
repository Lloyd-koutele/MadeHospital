package made.hospital.document;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Year;
import java.util.Date;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import made.hospital.commun.exception.BusinessException;
import made.hospital.document.application.DocumentService;
import made.hospital.document.application.ModeleService;
import made.hospital.document.application.RenduPdf;
import made.hospital.document.application.SejourService;
import made.hospital.dossiermedical.domaine.DossierMedical;
import made.hospital.etablissement.application.EtablissementService;
import made.hospital.medecin.domaine.MedecinEntite;
import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.notification.infra.NotificationRepository;
import made.hospital.patient.domaine.Patient;
import made.hospital.patient.infra.PatientRepository;
import made.hospital.securite.application.UserDetailsImpl;
import made.hospital.servicehospitalier.api.dto.ServiceHospitalierDto;
import made.hospital.servicehospitalier.application.ServiceHospitalierService;

/**
 * Parcours complet : identité de l'hôpital, chef de service, modèle, document signé, vérification, PDF,
 * rectification et compte rendu d'hospitalisation.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {"spring.main.allow-bean-definition-overriding=true"})
@Transactional
class ParcoursDocumentsTest
{

    @Autowired private EtablissementService etablissement;
    @Autowired private ServiceHospitalierService services;
    @Autowired private MedecinRepository medecins;
    @Autowired private PatientRepository patients;
    @Autowired private ModeleService modeles;
    @Autowired private DocumentService documents;
    @Autowired private SejourService sejours;
    @Autowired private RenduPdf rendu;
    @Autowired private NotificationRepository notifications;
    @Autowired private ObjectMapper mapper;

    @Test
    void parcoursComplet() throws Exception
    {
        // 1. Aucun compte ne peut être créé avant l'identité de l'hôpital
        if (!etablissement.estConfigure())
        {
            assertThrows(BusinessException.class, etablissement::exigerConfiguration);
        }
        etablissement.configurer("Hôpital de test", "RONDE", null, true);
        assertTrue(etablissement.estConfigure());
        assertTrue(etablissement.logo().length > 1000);

        // 2. Service, médecin, chef de service
        ServiceHospitalierDto service = services.creer(new ServiceHospitalierDto.Requete("Cardiologie test", null));
        MedecinEntite medecin = medecins.save(new MedecinEntite("Diallo", "Moussa", "chef.parcours@test.sn", "x",
                "770000001", "Cardiologie", "ORD-1"));
        MedecinEntite confrere = medecins.save(new MedecinEntite("Ba", "Fatou", "confrere.parcours@test.sn", "x",
                "770000002", "Cardiologie", "ORD-2"));
        services.affecterMedecins(service.id(), List.of(medecin.getId(), confrere.getId()));
        assertThrows(IllegalArgumentException.class, () -> services.designerChef(service.id(), 999_999L));
        services.designerChef(service.id(), medecin.getId());
        UserDetailsImpl chef = UserDetailsImpl.depuis(medecins.findById(medecin.getId()).orElseThrow());
        UserDetailsImpl autre = UserDetailsImpl.depuis(medecins.findById(confrere.getId()).orElseThrow());
        assertTrue(services.estChef(chef, service.id()));
        assertFalse(services.estChef(autre, service.id()));

        // 3. Patient suivi par le chef
        Patient patient = new Patient("Ndiaye", "Awa", "patient.parcours@test.sn",
                new DossierMedical("F", "O+", null, "70", "165"), new Date(), "770000003", medecin);
        patient.setPassword("x");
        patient = patients.save(patient);
        int patientId = patient.getId();

        // 4. Galerie : le « Document libre » intégré, puis les modèles créés par le chef ; le confrère ne gère pas les modèles
        assertEquals(List.of("DOCUMENT_LIBRE"), modeles.galerie(chef, service.id()).stream().map(ModeleService.ModeleResume::type).toList());
        assertTrue(modeles.modelesDuChef(chef).isEmpty());
        JsonNode modelesTest;
        try (InputStream flux = new ClassPathResource("documents/modeles-test.json").getInputStream())
        {
            modelesTest = mapper.readTree(flux);
        }
        Long ordonnance = null;
        Long crh = null;
        for (JsonNode m : modelesTest)
        {
            Long id = modeles.creer(chef, new ModeleService.RequeteModele(service.id(), m.get("nom").asText(), null,
                    m.get("type").asText(), m.get("structure"))).resume().id();
            if (m.get("type").asText().equals("ORDONNANCE"))
            {
                ordonnance = id;
            }
            else
            {
                crh = id;
            }
        }
        assertEquals(3, modeles.galerie(chef, service.id()).size());
        assertThrows(BusinessException.class, () -> modeles.creer(autre, new ModeleService.RequeteModele(service.id(),
                "Test", null, "AUTRE", mapper.readTree("{\"sections\":[{\"titre\":\"A\",\"blocs\":[]}]}"))));

        // 5. Document : saisie nettoyée, valeurs automatiques, validation signée
        DocumentService.DocumentDetail brouillon = documents.creer(chef, patientId, ordonnance, service.id(), null);
        assertEquals("BROUILLON", brouillon.resume().statut());
        DocumentService.DocumentDetail saisi = documents.modifier(chef, brouillon.resume().id(), null, mapper.readTree("""
                {"lignes":[{"medicament":"Amoxicilline","dosage":"500 mg","posologie":"1 x 3 / jour","duree":"7 jours"}],
                 "pirate":"x"}"""), null);
        assertFalse(saisi.valeurs().has("pirate"));
        assertEquals("Awa Ndiaye", saisi.valeurs().path("@patient.nom").asText());

        DocumentService.DocumentDetail valide = documents.valider(chef, brouillon.resume().id());
        assertEquals("VALIDE", valide.resume().statut());
        assertTrue(valide.resume().numero().startsWith("ORD-" + Year.now().getValue() + "-"));
        assertThrows(BusinessException.class, () -> documents.modifier(chef, brouillon.resume().id(), null, mapper.createObjectNode(), null));

        // 6. Vérification publique et PDF
        DocumentService.Verification verification = documents.verifier(valide.resume().numero(), valide.empreinte().substring(0, 16));
        assertTrue(verification.authentique());
        assertFalse(documents.verifier(valide.resume().numero(), "ffffffffffffffff").authentique());
        byte[] pdf = rendu.pdf(documents.documentPourPdf(chef, brouillon.resume().id()));
        assertEquals("%PDF", new String(pdf, 0, 4, StandardCharsets.US_ASCII));

        // 7. Rectification : nouvelle version, l'ancienne est marquée rectifiée
        DocumentService.DocumentDetail correction = documents.rectifier(chef, brouillon.resume().id());
        documents.valider(chef, correction.resume().id());
        DocumentService.Verification ancienne = documents.verifier(valide.resume().numero(), null);
        assertEquals("RECTIFIE", ancienne.statut());
        assertNotNull(ancienne.remplacePar());

        // 8. Modèle du service enregistré par le chef : aussitôt visible dans la galerie (pas d'étape de publication)
        ModeleService.ModeleDetail cree = modeles.creer(chef, new ModeleService.RequeteModele(service.id(), "CR d'écho cardiaque",
                null, "COMPTE_RENDU_IMAGERIE", mapper.readTree("""
                {"sections":[{"titre":"Résultats","blocs":[
                  {"type":"TEXTE","texte":"Échographie transthoracique.","verrouille":true},
                  {"type":"CHAMP","cle":"fevg","libelle":"FEVG","champ":"NOMBRE","unite":"%","obligatoire":true}]}]}""")));
        assertEquals("PUBLIE", cree.resume().statut());
        assertTrue(modeles.galerie(autre, service.id()).stream().anyMatch(m -> m.id().equals(cree.resume().id())));
        assertTrue(notifications.countByDestinataireIdAndLueFalse(confrere.getId()) > 0);

        // 9. Champ obligatoire manquant : validation refusée
        DocumentService.DocumentDetail echo = documents.creer(chef, patientId, cree.resume().id(), service.id(), null);
        assertThrows(BusinessException.class, () -> documents.valider(chef, echo.resume().id()));

        // 10. Séjour et compte rendu d'hospitalisation rattaché
        Long crhId = crh;
        assertThrows(BusinessException.class, () -> documents.creer(chef, patientId, crhId, service.id(), null));
        SejourService.SejourDto sejour = sejours.admettre(chef, patientId, service.id(), "12B", "Fièvre", null);
        assertThrows(BusinessException.class, () -> sejours.admettre(chef, patientId, service.id(), "13", "x", null));
        DocumentService.DocumentDetail compteRendu = documents.creer(chef, patientId, crhId, service.id(), null);
        assertEquals(sejour.id(), compteRendu.resume().sejourId());
        assertEquals("12B", compteRendu.valeurs().path("@sejour.lit").asText());
        sejours.sortie(chef, sejour.id(), null);

        // 11. Demande de modèle : le chef est prévenu
        long avant = notifications.countByDestinataireIdAndLueFalse(medecin.getId());
        modeles.demander(autre, "Dr Fatou Ba", service.id(), "Compte rendu de Holter", null, null);
        assertEquals(avant + 1, notifications.countByDestinataireIdAndLueFalse(medecin.getId()));
        assertEquals(1, modeles.demandesDuChef(chef).size());
    }
}
