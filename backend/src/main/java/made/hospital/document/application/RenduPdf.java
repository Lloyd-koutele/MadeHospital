package made.hospital.document.application;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import made.hospital.document.domaine.DocumentMedical;
import made.hospital.document.domaine.DocumentMedical.Statut;
import made.hospital.document.domaine.TypeDocument;
import made.hospital.etablissement.application.EtablissementService;

/**
 * Mise en page PDF d'un document : en-tête (symbole, hôpital, service), identité, sections, signature et QR code
 * de vérification. Le contenu est toujours échappé ; les champs vides ne sont pas imprimés.
 */
@Component
public class RenduPdf
{

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter JOUR_HEURE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final StructureDocument structure;
    private final EtablissementService etablissement;
    private final String urlPublique;

    public RenduPdf(StructureDocument structure, EtablissementService etablissement,
                    @Value("${app.url-publique:https://madehospital.sn}") String urlPublique)
    {
        this.structure = structure;
        this.etablissement = etablissement;
        this.urlPublique = urlPublique.replaceAll("/+$", "");
    }

    public byte[] pdf(DocumentMedical document)
    {
        String html = html(document);
        try (ByteArrayOutputStream sortie = new ByteArrayOutputStream())
        {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useFont(() -> flux("fonts/LiberationSans-Regular.ttf"), "Liberation Sans", 400,
                    com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL, true);
            builder.useFont(() -> flux("fonts/LiberationSans-Bold.ttf"), "Liberation Sans", 700,
                    com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL, true);
            builder.withHtmlContent(html, null);
            builder.toStream(sortie);
            builder.run();
            return sortie.toByteArray();
        }
        catch (IOException e)
        {
            throw new IllegalStateException("Génération du PDF impossible", e);
        }
    }

    private static java.io.InputStream flux(String chemin)
    {
        try
        {
            return new ClassPathResource(chemin).getInputStream();
        }
        catch (IOException e)
        {
            throw new IllegalStateException(e);
        }
    }

    String html(DocumentMedical d)
    {
        JsonNode valeurs = structure.lire(d.getValeurs());
        JsonNode struct = structure.lire(d.getStructure());
        boolean examen = d.getType() == TypeDocument.RESULTAT_EXAMEN;
        String accent = examen ? "#2e8b57" : "#0077B6";
        String fondBloc = examen ? "#eef8f1" : "#F1F5F9";

        StringBuilder h = new StringBuilder(8000);
        h.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><style>")
         .append("@page{size:A4;margin:16mm 15mm 18mm 15mm;@bottom-center{content:'Page ' counter(page) ' / ' counter(pages);font-family:'Liberation Sans';font-size:8pt;color:#64748b}}")
         .append("body{font-family:'Liberation Sans';font-size:10pt;color:#263238;line-height:1.45}")
         .append(".entete{border-bottom:2px solid ").append(accent).append(";padding-bottom:8px;margin-bottom:10px}")
         .append(".entete td{vertical-align:middle}")
         .append(".logo{max-height:52px;max-width:90px}")
         .append(".hopital{font-size:13pt;font-weight:700;color:#0B2545}")
         .append(".service{font-size:9pt;color:#546E7A}")
         .append("h1{font-size:15pt;color:").append(accent).append(";margin:6px 0 2px 0}")
         .append(".meta{font-size:8.5pt;color:#546E7A;margin-bottom:8px}")
         .append(".statut{border:1px solid ").append(accent).append(";color:").append(accent).append(";padding:0 5px;font-size:8pt}")
         .append(".identite{background:").append(fondBloc).append(";padding:6px 8px;margin:6px 0 10px 0}")
         .append(".identite td{font-size:9pt;padding:1px 10px 1px 0}")
         .append("h2{font-size:10.5pt;color:#0B2545;margin:10px 0 4px 0;border-bottom:0.5px solid #CBD5E1;padding-bottom:2px}")
         .append(".champ{margin:3px 0}.libelle{font-weight:700;color:#37474F}.zone-libre{margin:12px 0 6px 0}")
         .append("table.t{width:100%;border-collapse:collapse;margin:4px 0;font-size:9pt}")
         .append("table.t th{text-align:left;background:").append(fondBloc).append(";padding:3px 4px;border-bottom:1px solid #CBD5E1}")
         .append("table.t td{padding:3px 4px;border-bottom:0.5px solid #E2E8F0}")
         .append(".hn{color:#C62828;font-weight:700}")
         .append(".pied{margin-top:16px;border-top:0.5px solid #CBD5E1;padding-top:6px;font-size:8.5pt;color:#546E7A}")
         .append("</style></head><body>");

        // En-tête
        h.append("<table class=\"entete\" width=\"100%\"><tr><td width=\"70\"><img class=\"logo\" src=\"data:image/png;base64,")
         .append(Base64.getEncoder().encodeToString(etablissement.logo()))
         .append("\"/></td><td><div class=\"hopital\">").append(e(etablissement.nom())).append("</div><div class=\"service\">")
         .append(d.getServiceNom() == null ? "" : "Service : " + e(d.getServiceNom())).append("</div></td></tr></table>");

        h.append("<h1>").append(e(d.getTitre())).append("</h1><div class=\"meta\">");
        h.append(d.getNumero() == null ? "Sans numéro" : "N° " + e(d.getNumero()));
        LocalDateTime date = d.getDateValidation() != null ? d.getDateValidation() : d.getDateCreation();
        h.append(" · ").append(date.format(JOUR));
        if (d.getStatut() != Statut.BROUILLON)
        {
            h.append(" · <span class=\"statut\">").append(libelleStatut(d.getStatut())).append("</span>");
        }
        h.append("</div>");

        for (JsonNode section : struct.path("sections"))
        {
            // Les données automatiques consécutives forment un encadré sur deux colonnes ; une section qui commence
            // par cet encadré (ex. « Patient ») n'affiche pas son titre, comme la section d'identité.
            JsonNode blocs = section.path("blocs");
            boolean commenceParIdentite = blocs.size() > 0 && "AUTO".equals(blocs.get(0).path("type").asText());
            StringBuilder contenu = new StringBuilder();
            List<JsonNode> automatiques = new ArrayList<>();
            for (JsonNode bloc : blocs)
            {
                if ("AUTO".equals(bloc.path("type").asText()))
                {
                    automatiques.add(bloc);
                    continue;
                }
                identite(contenu, automatiques, valeurs);
                bloc(contenu, bloc, valeurs);
            }
            identite(contenu, automatiques, valeurs);
            if (contenu.length() > 0)
            {
                if (!commenceParIdentite)
                {
                    h.append("<h2>").append(e(section.path("titre").asText())).append("</h2>");
                }
                h.append(contenu);
            }
        }

        // Pied : auteur, signature et vérification
        h.append("<table class=\"pied\" width=\"100%\"><tr><td>");
        h.append("<b>").append(e(d.getAuteurNom() == null ? "" : d.getAuteurNom())).append("</b><br/>");
        switch (d.getStatut())
        {
            case VALIDE, RECTIFIE -> h.append("Signé électroniquement le ").append(d.getDateValidation().format(JOUR_HEURE))
                    .append("<br/>Empreinte : ").append(e(d.getEmpreinte().substring(0, 16))).append("…")
                    .append("<br/>Vérifier : ").append(e(urlVerification(d)));
            case IMPORTE -> h.append("Repris de l'ancien dossier — non signé électroniquement.");
            default -> h.append("Brouillon — ce document n'a pas de valeur tant qu'il n'est pas validé.");
        }
        if (d.getStatut() == Statut.RECTIFIE)
        {
            h.append("<br/><span class=\"hn\">Ce document a été remplacé par une version rectifiée.</span>");
        }
        h.append("</td>");
        if ((d.getStatut() == Statut.VALIDE || d.getStatut() == Statut.RECTIFIE) && d.getNumero() != null)
        {
            h.append("<td width=\"80\" align=\"right\"><img width=\"72\" height=\"72\" src=\"data:image/png;base64,")
             .append(qr(urlVerification(d))).append("\"/></td>");
        }
        h.append("</tr></table></body></html>");
        return h.toString();
    }

    /** Encadré des données automatiques, deux par ligne ; vide la liste après usage. */
    private static void identite(StringBuilder h, List<JsonNode> automatiques, JsonNode valeurs)
    {
        if (automatiques.isEmpty())
        {
            return;
        }
        h.append("<div class=\"identite\"><table>");
        int i = 0;
        for (JsonNode bloc : automatiques)
        {
            if (i % 2 == 0)
            {
                h.append("<tr>");
            }
            h.append("<td><span class=\"libelle\">").append(e(bloc.path("libelle").asText())).append(" :</span> ")
             .append(e(valeurs.path("@" + bloc.path("source").asText()).asText(""))).append("</td>");
            if (i % 2 == 1)
            {
                h.append("</tr>");
            }
            i++;
        }
        if (i % 2 == 1)
        {
            h.append("<td></td></tr>");
        }
        h.append("</table></div>");
        automatiques.clear();
    }

    private void bloc(StringBuilder h, JsonNode bloc, JsonNode valeurs)
    {
        switch (bloc.path("type").asText())
        {
            case "TEXTE" ->
            {
                String texte = bloc.path("verrouille").asBoolean(true)
                        ? bloc.path("texte").asText("")
                        : valeurs.path(bloc.path("cle").asText()).asText("");
                if (!texte.isBlank())
                {
                    h.append("<p>").append(multiligne(texte)).append("</p>");
                }
            }
            case "AUTO" ->
            {
                String v = valeurs.path("@" + bloc.path("source").asText()).asText("");
                if (!v.isBlank())
                {
                    h.append("<div class=\"champ\"><span class=\"libelle\">").append(e(bloc.path("libelle").asText()))
                     .append(" :</span> ").append(e(v)).append("</div>");
                }
            }
            case "CHAMP" -> champ(h, bloc, valeurs);
            default ->
            {
            }
        }
    }

    private void champ(StringBuilder h, JsonNode bloc, JsonNode valeurs)
    {
        String cle = bloc.path("cle").asText();
        JsonNode v = valeurs.get(cle);
        if (v == null || v.isNull() || (v.isTextual() && v.asText().isBlank()) || (v.isArray() && v.isEmpty()))
        {
            return;
        }
        String libelle = e(bloc.path("libelle").asText());
        String type = bloc.path("champ").asText();
        if ("TABLEAU".equals(type))
        {
            h.append("<table class=\"t\"><tr>");
            boolean normes = false;
            boolean resultat = false;
            for (JsonNode colonne : bloc.path("colonnes"))
            {
                h.append("<th>").append(e(colonne.path("libelle").asText())).append("</th>");
                normes |= "normes".equals(colonne.path("cle").asText());
                resultat |= "resultat".equals(colonne.path("cle").asText());
            }
            h.append("</tr>");
            for (JsonNode ligne : v)
            {
                NormesExamen.Ecart ecart = normes && resultat
                        ? NormesExamen.ecart(ligne.path("resultat").asText(), ligne.path("normes").asText()) : null;
                h.append("<tr>");
                for (JsonNode colonne : bloc.path("colonnes"))
                {
                    String c = colonne.path("cle").asText();
                    String texte = e(ligne.path(c).asText(""));
                    if ("resultat".equals(c) && ecart != null)
                    {
                        h.append("<td class=\"hn\">").append(texte).append(ecart == NormesExamen.Ecart.HAUT ? " ↑" : " ↓").append("</td>");
                    }
                    else
                    {
                        h.append("<td>").append(texte).append("</td>");
                    }
                }
                h.append("</tr>");
            }
            h.append("</table>");
            return;
        }
        String texte = switch (type)
        {
            case "NOMBRE" -> e(v.asText()) + (bloc.hasNonNull("unite") ? " " + e(bloc.path("unite").asText()) : "");
            case "DATE" -> e(LocalDate.parse(v.asText()).format(JOUR));
            case "CASE" -> v.asBoolean(false) ? "Oui" : "Non";
            case "EQUIPE" ->
            {
                StringBuilder noms = new StringBuilder();
                for (JsonNode nom : v)
                {
                    noms.append(noms.length() == 0 ? "" : ", ").append(e(nom.asText()));
                }
                yield noms.toString();
            }
            case "DOCUMENT_LIE", "IMAGES" -> e(valeurs.path(StructureDocument.PREFIXE_AFFICHAGE + cle).asText(""));
            case "TEXTE_LONG", "ZONE_LIBRE" -> multiligne(v.asText());
            default -> e(v.asText());
        };
        if ("CASE".equals(type) && !v.asBoolean(false))
        {
            return;
        }
        if (StructureDocument.ZONE_LIBRE.equals(type))
        {
            h.append("<div class=\"champ zone-libre\">").append(texte).append("</div>");
        }
        else if ("TEXTE_LONG".equals(type))
        {
            h.append("<div class=\"champ\"><div class=\"libelle\">").append(libelle).append("</div>").append(texte).append("</div>");
        }
        else
        {
            h.append("<div class=\"champ\"><span class=\"libelle\">").append(libelle).append(" :</span> ").append(texte).append("</div>");
        }
    }

    private String urlVerification(DocumentMedical d)
    {
        return urlPublique + "/verifier/" + d.getNumero() + "?e=" + d.getEmpreinte().substring(0, 16);
    }

    private static String qr(String texte)
    {
        try
        {
            BitMatrix matrice = new QRCodeWriter().encode(texte, BarcodeFormat.QR_CODE, 220, 220, Map.of(EncodeHintType.MARGIN, 1));
            BufferedImage image = new BufferedImage(matrice.getWidth(), matrice.getHeight(), BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < matrice.getWidth(); x++)
            {
                for (int y = 0; y < matrice.getHeight(); y++)
                {
                    image.setRGB(x, y, matrice.get(x, y) ? 0x0B2545 : 0xFFFFFF);
                }
            }
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            ImageIO.write(image, "png", sortie);
            return Base64.getEncoder().encodeToString(sortie.toByteArray());
        }
        catch (WriterException | IOException e)
        {
            throw new IllegalStateException("QR code impossible", e);
        }
    }

    private static String libelleStatut(Statut statut)
    {
        return switch (statut)
        {
            case VALIDE -> "Validé";
            case RECTIFIE -> "Rectifié";
            case IMPORTE -> "Ancien dossier";
            default -> "Brouillon";
        };
    }

    private static String multiligne(String texte)
    {
        return e(texte).replace("\n", "<br/>");
    }

    /** Échappement XML (le moteur PDF exige du XHTML bien formé). */
    static String e(String texte)
    {
        if (texte == null)
        {
            return "";
        }
        StringBuilder sb = new StringBuilder(texte.length());
        for (char c : texte.toCharArray())
        {
            switch (c)
            {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default ->
                {
                    if (c >= 0x20 || c == '\n' || c == '\t')
                    {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
