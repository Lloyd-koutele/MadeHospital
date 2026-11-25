package made.hospital.document.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import made.hospital.commun.exception.BusinessException;
import made.hospital.document.domaine.DocumentMedical;
import made.hospital.document.domaine.TypeDocument;
import made.hospital.etablissement.application.EtablissementService;

class DocumentsTest
{

    private final ObjectMapper mapper = new ObjectMapper();
    private final StructureDocument structure = new StructureDocument(mapper);

    @Test
    void leDocumentLibreIntegreEstValide() throws Exception
    {
        try (InputStream flux = new ClassPathResource("documents/bibliotheque.json").getInputStream())
        {
            JsonNode liste = mapper.readTree(new String(flux.readAllBytes(), StandardCharsets.UTF_8));
            assertTrue(liste.size() == 1 && "DOCUMENT_LIBRE".equals(liste.get(0).get("type").asText()));
            for (JsonNode modele : liste)
            {
                structure.normaliser(modele.get("structure"));
                TypeDocument.valueOf(modele.get("type").asText());
            }
        }
    }

    @Test
    void lesValeursInconnuesSontEcarteesEtLesTypesControles() throws Exception
    {
        String s = structure.normaliser(mapper.readTree("""
                {"sections":[{"titre":"A","blocs":[
                 {"type":"CHAMP","cle":"poids","libelle":"Poids","champ":"NOMBRE"},
                 {"type":"CHAMP","cle":"mode","libelle":"Mode","champ":"CHOIX","options":["Oui","Non"],"obligatoire":true}]}]}"""));
        ObjectNode v = structure.nettoyer(s, mapper.readTree("{\"poids\":\"72,5\",\"pirate\":\"x\",\"mode\":\"Oui\"}"));
        assertEquals("72.5", v.get("poids").asText());
        assertNull(v.get("pirate"));
        assertThrows(BusinessException.class, () -> structure.nettoyer(s, mapper.readTree("{\"mode\":\"Peut-être\"}")));
        assertEquals(1, structure.manquants(s, mapper.createObjectNode()).size());
    }

    @Test
    void uneCleEnDoubleEstRefusee()
    {
        assertThrows(BusinessException.class, () -> structure.normaliser(mapper.readTree("""
                {"sections":[{"titre":"A","blocs":[
                 {"type":"CHAMP","cle":"x","libelle":"X","champ":"TEXTE_COURT"},
                 {"type":"CHAMP","cle":"x","libelle":"Y","champ":"TEXTE_COURT"}]}]}""")));
    }

    @Test
    void lesValeursHorsNormeSontDetectees()
    {
        assertEquals(NormesExamen.Ecart.HAUT, NormesExamen.ecart("1,82", "< 1,60"));
        assertEquals(NormesExamen.Ecart.BAS, NormesExamen.ecart("0,5", "0,70 - 1,10"));
        assertNull(NormesExamen.ecart("0,98", "0,70 - 1,10"));
        assertNull(NormesExamen.ecart("positif", "négatif"));
        assertEquals(NormesExamen.Ecart.BAS, NormesExamen.ecart("55", "> 60"));
    }

    @Test
    void lePdfEstGenereEtLeContenuEchappe() throws Exception
    {
        EtablissementService etablissement = mock(EtablissementService.class);
        when(etablissement.logo()).thenReturn(new ClassPathResource("etablissement/logo-defaut.png").getInputStream().readAllBytes());
        when(etablissement.nom()).thenReturn("Hôpital <test>");
        RenduPdf rendu = new RenduPdf(structure, etablissement, "https://madehospital.sn");

        DocumentMedical d = new DocumentMedical();
        d.setType(TypeDocument.RESULTAT_EXAMEN);
        d.setTitre("Résultats d'examen");
        d.setPatientId(1);
        d.setServiceNom("Laboratoire");
        d.setAuteurNom("Dr Test");
        d.setNumero("RES-2026-000001");
        d.setEmpreinte("0123456789abcdef0123456789abcdef");
        d.setDateValidation(LocalDateTime.now());
        d.setStatut(DocumentMedical.Statut.VALIDE);
        d.setStructure(structure.normaliser(mapper.readTree("""
                {"sections":[{"titre":"Résultats","blocs":[{"type":"CHAMP","cle":"r","libelle":"R","champ":"TABLEAU",
                "colonnes":[{"cle":"analyse","libelle":"Analyse"},{"cle":"resultat","libelle":"Résultat"},{"cle":"normes","libelle":"Normes"}]}]}]}""")));
        d.setValeurs("{\"r\":[{\"analyse\":\"LDL <script>\",\"resultat\":\"1,82\",\"normes\":\"< 1,60\"}]}");

        String html = rendu.html(d);
        assertTrue(html.contains("LDL &lt;script&gt;"));
        assertTrue(html.contains("class=\"hn\""));
        byte[] pdf = rendu.pdf(d);
        assertTrue(pdf.length > 1000);
        assertEquals("%PDF", new String(pdf, 0, 4, StandardCharsets.US_ASCII));
    }

    @Test
    void laZoneDeTexteLibreSAfficheSansTitre() throws Exception
    {
        String s = structure.normaliser(mapper.readTree("""
                {"sections":[{"titre":"Patient","blocs":[
                  {"type":"AUTO","source":"patient.nom","libelle":"Patient"},
                  {"type":"AUTO","source":"patient.sexe","libelle":"Sexe"},
                  {"type":"CHAMP","cle":"corps","libelle":"","champ":"ZONE_LIBRE"}]}]}"""));
        assertEquals("Zone de texte libre", structure.lire(s).at("/sections/0/blocs/2/libelle").asText());

        EtablissementService etablissement = mock(EtablissementService.class);
        when(etablissement.logo()).thenReturn(new ClassPathResource("etablissement/logo-defaut.png").getInputStream().readAllBytes());
        when(etablissement.nom()).thenReturn("Hôpital");
        DocumentMedical d = new DocumentMedical();
        d.setType(TypeDocument.ORDONNANCE);
        d.setTitre("Ordonnance");
        d.setPatientId(1);
        d.setStatut(DocumentMedical.Statut.BROUILLON);
        d.setStructure(s);
        d.setValeurs(structure.ecrire(structure.nettoyer(s, mapper.readTree("{\"corps\":\"Amoxicilline 1 g\\n3 fois par jour\"}"))));

        String html = new RenduPdf(structure, etablissement, "https://madehospital.sn").html(d);
        assertTrue(html.contains("Amoxicilline 1 g"));
        assertFalse(html.contains("Zone de texte libre"));
        // données automatiques en encadré, section sans titre, ni insigne ni filigrane « Brouillon »
        assertTrue(html.contains("<div class=\"identite\">"));
        assertFalse(html.contains("<h2>Patient</h2>"));
        assertFalse(html.contains("class=\"statut\""));
        assertFalse(html.contains("BROUILLON"));
    }
}
