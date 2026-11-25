package made.hospital.document.application;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import made.hospital.commun.exception.BusinessException;
import made.hospital.document.domaine.TypeDocument;

/**
 * Lecture, contrôle et nettoyage de la structure d'un modèle et des valeurs saisies.
 *
 * Structure : { "libre": bool, "sections": [ { "titre", "blocs": [ bloc ] } ] } où un bloc est
 * - TEXTE  : texte déjà rédigé, verrouillé ou modifiable (alors identifié par une clé) ;
 * - AUTO   : valeur remplie par le serveur (patient, médecin, service, date, séjour) ;
 * - CHAMP  : zone à saisir, typée (texte, nombre, date, heure, choix, case, équipe, tableau, document lié, images).
 *
 * Tout ce qui n'est pas prévu est écarté : seules les clés connues sont conservées.
 */
@Component
public class StructureDocument
{

    public static final Set<String> TYPES_CHAMPS = Set.of("TEXTE_COURT", "TEXTE_LONG", "NOMBRE", "DATE", "HEURE",
            "CHOIX", "CASE", "EQUIPE", "TABLEAU", "DOCUMENT_LIE", "IMAGES", "ZONE_LIBRE");

    /** Zone de texte libre : texte sur plusieurs lignes, affiché sans titre (ex. corps d'une ordonnance). */
    public static final String ZONE_LIBRE = "ZONE_LIBRE";
    private static final String LIBELLE_ZONE_LIBRE = "Zone de texte libre";

    public static final Set<String> SOURCES_AUTO = Set.of("patient.nom", "patient.naissance", "patient.sexe",
            "patient.dossier", "medecin.nom", "medecin.specialite", "service.nom", "date",
            "sejour.numero", "sejour.entree", "sejour.sortie", "sejour.lit", "sejour.motif");

    /** Préfixe des valeurs calculées par le serveur dans les valeurs d'un document. */
    public static final String PREFIXE_AUTO = "@";
    public static final String PREFIXE_AFFICHAGE = "@affichage.";

    private static final Pattern CLE = Pattern.compile("[a-z][a-z0-9_]{0,39}");

    private final ObjectMapper mapper;

    public StructureDocument(ObjectMapper mapper)
    {
        this.mapper = mapper;
    }

    // ---------- Structure ----------

    /** Contrôle et normalise une structure de modèle ; renvoie le JSON propre. */
    public String normaliser(JsonNode brute)
    {
        if (brute == null || !brute.isObject())
        {
            throw new BusinessException("Structure de modèle invalide.");
        }
        ObjectNode propre = mapper.createObjectNode();
        propre.put("libre", brute.path("libre").asBoolean(false));
        ArrayNode sections = propre.putArray("sections");
        JsonNode sourceSections = brute.path("sections");
        if (!sourceSections.isArray() || sourceSections.isEmpty())
        {
            throw new BusinessException("Un modèle doit contenir au moins une section.");
        }
        if (sourceSections.size() > 40)
        {
            throw new BusinessException("Un modèle contient au plus 40 sections.");
        }
        Set<String> cles = new HashSet<>();
        int compteurTexte = 0;
        for (JsonNode section : sourceSections)
        {
            ObjectNode s = sections.addObject();
            s.put("titre", texte(section.path("titre"), 150, "Titre de section"));
            ArrayNode blocs = s.putArray("blocs");
            JsonNode sourceBlocs = section.path("blocs");
            if (!sourceBlocs.isArray())
            {
                continue;
            }
            if (sourceBlocs.size() > 60)
            {
                throw new BusinessException("Une section contient au plus 60 éléments.");
            }
            for (JsonNode bloc : sourceBlocs)
            {
                String type = bloc.path("type").asText("");
                switch (type)
                {
                    case "TEXTE" ->
                    {
                        ObjectNode b = blocs.addObject();
                        b.put("type", "TEXTE");
                        b.put("texte", limiter(bloc.path("texte").asText(""), 5000));
                        boolean verrouille = bloc.path("verrouille").asBoolean(true);
                        b.put("verrouille", verrouille);
                        if (!verrouille)
                        {
                            String cle = bloc.path("cle").asText("");
                            if (!CLE.matcher(cle).matches() || cles.contains(cle))
                            {
                                do
                                {
                                    cle = "texte_" + (++compteurTexte);
                                }
                                while (cles.contains(cle));
                            }
                            cles.add(cle);
                            b.put("cle", cle);
                        }
                    }
                    case "AUTO" ->
                    {
                        String source = bloc.path("source").asText("");
                        if (!SOURCES_AUTO.contains(source))
                        {
                            throw new BusinessException("Champ automatique inconnu : " + source);
                        }
                        ObjectNode b = blocs.addObject();
                        b.put("type", "AUTO");
                        b.put("source", source);
                        b.put("libelle", limiter(bloc.path("libelle").asText(""), 100));
                    }
                    case "CHAMP" -> blocs.add(champ(bloc, cles));
                    default -> throw new BusinessException("Élément de modèle inconnu : " + type);
                }
            }
        }
        return ecrire(propre);
    }

    public String normaliser(String json)
    {
        return normaliser(lire(json));
    }

    private ObjectNode champ(JsonNode bloc, Set<String> cles)
    {
        String cle = bloc.path("cle").asText("");
        if (!CLE.matcher(cle).matches())
        {
            throw new BusinessException("Clé de champ invalide « " + cle + " » : lettres minuscules, chiffres et _.");
        }
        if (!cles.add(cle))
        {
            throw new BusinessException("La clé de champ « " + cle + " » est utilisée deux fois.");
        }
        String champ = bloc.path("champ").asText("");
        if (!TYPES_CHAMPS.contains(champ))
        {
            throw new BusinessException("Type de champ inconnu : " + champ);
        }
        ObjectNode b = mapper.createObjectNode();
        b.put("type", "CHAMP");
        b.put("cle", cle);
        // la zone libre n'affiche pas de titre : son libellé ne sert qu'aux messages (champ obligatoire, etc.)
        b.put("libelle", ZONE_LIBRE.equals(champ) && bloc.path("libelle").asText("").isBlank()
                ? LIBELLE_ZONE_LIBRE : texte(bloc.path("libelle"), 150, "Libellé du champ"));
        b.put("champ", champ);
        b.put("obligatoire", bloc.path("obligatoire").asBoolean(false));
        if (bloc.hasNonNull("aide"))
        {
            b.put("aide", limiter(bloc.path("aide").asText(""), 300));
        }
        if (bloc.hasNonNull("unite"))
        {
            b.put("unite", limiter(bloc.path("unite").asText(""), 20));
        }
        if (bloc.hasNonNull("defaut") && !bloc.path("defaut").asText("").isBlank())
        {
            b.put("defaut", limiter(bloc.path("defaut").asText(""), 2000));
        }
        ArrayNode phrases = listeTextes(bloc.path("phrases"), 30, 300);
        if (!phrases.isEmpty())
        {
            b.set("phrases", phrases);
        }
        if ("CHOIX".equals(champ))
        {
            ArrayNode options = listeTextes(bloc.path("options"), 30, 100);
            if (options.isEmpty())
            {
                throw new BusinessException("Le champ « " + b.get("libelle").asText() + " » doit proposer au moins un choix.");
            }
            b.set("options", options);
        }
        if ("TABLEAU".equals(champ))
        {
            ArrayNode colonnes = b.putArray("colonnes");
            Set<String> clesColonnes = new HashSet<>();
            for (JsonNode colonne : bloc.path("colonnes"))
            {
                String c = colonne.path("cle").asText("");
                if (!CLE.matcher(c).matches() || !clesColonnes.add(c))
                {
                    throw new BusinessException("Colonne invalide dans le tableau « " + b.get("libelle").asText() + " ».");
                }
                ObjectNode col = colonnes.addObject();
                col.put("cle", c);
                col.put("libelle", texte(colonne.path("libelle"), 60, "Libellé de colonne"));
            }
            if (colonnes.isEmpty() || colonnes.size() > 8)
            {
                throw new BusinessException("Un tableau contient de 1 à 8 colonnes.");
            }
        }
        if ("DOCUMENT_LIE".equals(champ) && bloc.hasNonNull("typeLie"))
        {
            try
            {
                b.put("typeLie", TypeDocument.valueOf(bloc.path("typeLie").asText()).name());
            }
            catch (IllegalArgumentException e)
            {
                throw new BusinessException("Type de document lié inconnu.");
            }
        }
        return b;
    }

    /** Structure transmise au chef depuis un document libre : titres de sections seulement, aucune saisie. */
    public String structureSansDonnees(String structureJson)
    {
        JsonNode structure = lire(structureJson);
        ObjectNode propre = mapper.createObjectNode();
        propre.put("libre", false);
        ArrayNode sections = propre.putArray("sections");
        int n = 0;
        for (JsonNode section : structure.path("sections"))
        {
            n++;
            ObjectNode s = sections.addObject();
            s.put("titre", limiter(section.path("titre").asText("Section " + n), 150));
            ObjectNode champ = s.putArray("blocs").addObject();
            champ.put("type", "CHAMP");
            champ.put("cle", "section_" + n);
            champ.put("libelle", limiter(section.path("titre").asText("Section " + n), 150));
            champ.put("champ", "TEXTE_LONG");
            champ.put("obligatoire", false);
        }
        return ecrire(propre);
    }

    /** Structure d'un document libre définie par le médecin : chaque section a une seule zone de texte. */
    public String structureLibre(JsonNode brute)
    {
        ObjectNode propre = mapper.createObjectNode();
        propre.put("libre", true);
        ArrayNode sections = propre.putArray("sections");
        int n = 0;
        for (JsonNode section : brute.path("sections"))
        {
            if (++n > 30)
            {
                break;
            }
            ObjectNode s = sections.addObject();
            s.put("titre", limiter(section.path("titre").asText("Section " + n), 150));
            ObjectNode champ = s.putArray("blocs").addObject();
            champ.put("type", "CHAMP");
            champ.put("cle", "section_" + n);
            champ.put("libelle", limiter(section.path("titre").asText("Section " + n), 150));
            champ.put("champ", "TEXTE_LONG");
            champ.put("obligatoire", false);
        }
        if (sections.isEmpty())
        {
            throw new BusinessException("Un document libre contient au moins une section.");
        }
        return ecrire(propre);
    }

    /** Champs à saisir (et textes modifiables) d'une structure. */
    public List<JsonNode> champs(String structureJson)
    {
        List<JsonNode> resultat = new ArrayList<>();
        for (JsonNode section : lire(structureJson).path("sections"))
        {
            for (JsonNode bloc : section.path("blocs"))
            {
                if ("CHAMP".equals(bloc.path("type").asText())
                        || ("TEXTE".equals(bloc.path("type").asText()) && !bloc.path("verrouille").asBoolean(true)))
                {
                    resultat.add(bloc);
                }
            }
        }
        return resultat;
    }

    public Set<String> sourcesAuto(String structureJson)
    {
        Set<String> sources = new HashSet<>();
        for (JsonNode section : lire(structureJson).path("sections"))
        {
            for (JsonNode bloc : section.path("blocs"))
            {
                if ("AUTO".equals(bloc.path("type").asText()))
                {
                    sources.add(bloc.path("source").asText());
                }
            }
        }
        return sources;
    }

    // ---------- Valeurs ----------

    /** Valeurs initiales d'un nouveau document : valeurs par défaut et textes modifiables du modèle. */
    public ObjectNode valeursInitiales(String structureJson)
    {
        ObjectNode valeurs = mapper.createObjectNode();
        for (JsonNode bloc : champs(structureJson))
        {
            if ("TEXTE".equals(bloc.path("type").asText()))
            {
                valeurs.put(bloc.path("cle").asText(), bloc.path("texte").asText(""));
            }
            else if (bloc.hasNonNull("defaut"))
            {
                String champ = bloc.path("champ").asText();
                if ("CASE".equals(champ))
                {
                    valeurs.put(bloc.path("cle").asText(), Boolean.parseBoolean(bloc.path("defaut").asText()));
                }
                else
                {
                    valeurs.put(bloc.path("cle").asText(), bloc.path("defaut").asText());
                }
            }
        }
        return valeurs;
    }

    /** Ne garde que les valeurs des champs connus, converties et bornées. */
    public ObjectNode nettoyer(String structureJson, JsonNode brutes)
    {
        ObjectNode propres = mapper.createObjectNode();
        if (brutes == null || !brutes.isObject())
        {
            return propres;
        }
        for (JsonNode bloc : champs(structureJson))
        {
            String cle = bloc.path("cle").asText();
            JsonNode v = brutes.get(cle);
            if (v == null || v.isNull())
            {
                continue;
            }
            String champ = "TEXTE".equals(bloc.path("type").asText()) ? "TEXTE_LONG" : bloc.path("champ").asText();
            switch (champ)
            {
                case "TEXTE_COURT" -> propres.put(cle, limiter(v.asText(""), 500));
                case "TEXTE_LONG", "ZONE_LIBRE" -> propres.put(cle, limiter(v.asText(""), 20000));
                case "NOMBRE" ->
                {
                    String n = v.asText("").trim().replace(',', '.');
                    if (!n.isEmpty())
                    {
                        try
                        {
                            Double.parseDouble(n);
                            propres.put(cle, limiter(n, 30));
                        }
                        catch (NumberFormatException e)
                        {
                            throw new BusinessException("« " + bloc.path("libelle").asText() + " » doit être un nombre.");
                        }
                    }
                }
                case "DATE" ->
                {
                    String d = v.asText("").trim();
                    if (!d.isEmpty())
                    {
                        try
                        {
                            propres.put(cle, LocalDate.parse(d).toString());
                        }
                        catch (RuntimeException e)
                        {
                            throw new BusinessException("Date invalide pour « " + bloc.path("libelle").asText() + " ».");
                        }
                    }
                }
                case "HEURE" ->
                {
                    String h = v.asText("").trim();
                    if (!h.isEmpty())
                    {
                        try
                        {
                            propres.put(cle, LocalTime.parse(h).toString());
                        }
                        catch (RuntimeException e)
                        {
                            throw new BusinessException("Heure invalide pour « " + bloc.path("libelle").asText() + " ».");
                        }
                    }
                }
                case "CHOIX" ->
                {
                    String choix = v.asText("");
                    boolean connu = false;
                    for (JsonNode option : bloc.path("options"))
                    {
                        connu |= option.asText().equals(choix);
                    }
                    if (!choix.isEmpty() && !connu)
                    {
                        throw new BusinessException("Choix inconnu pour « " + bloc.path("libelle").asText() + " ».");
                    }
                    if (!choix.isEmpty())
                    {
                        propres.put(cle, choix);
                    }
                }
                case "CASE" -> propres.put(cle, v.asBoolean(false));
                case "EQUIPE" ->
                {
                    ArrayNode noms = listeTextes(v, 20, 150);
                    if (!noms.isEmpty())
                    {
                        propres.set(cle, noms);
                    }
                }
                case "TABLEAU" ->
                {
                    ArrayNode lignes = propres.putArray(cle);
                    if (v.isArray())
                    {
                        for (JsonNode ligne : v)
                        {
                            if (lignes.size() >= 100)
                            {
                                break;
                            }
                            ObjectNode l = mapper.createObjectNode();
                            boolean remplie = false;
                            for (JsonNode colonne : bloc.path("colonnes"))
                            {
                                String c = colonne.path("cle").asText();
                                String valeur = limiter(ligne.path(c).asText(""), 500);
                                l.put(c, valeur);
                                remplie |= !valeur.isBlank();
                            }
                            if (remplie)
                            {
                                lignes.add(l);
                            }
                        }
                    }
                }
                case "DOCUMENT_LIE" ->
                {
                    String id = v.asText("").trim();
                    if (!id.isEmpty())
                    {
                        propres.put(cle, limiter(id, 40));
                    }
                }
                case "IMAGES" ->
                {
                    ArrayNode ids = listeTextes(v, 30, 40);
                    if (!ids.isEmpty())
                    {
                        propres.set(cle, ids);
                    }
                }
                default ->
                {
                }
            }
        }
        return propres;
    }

    /** Libellés des champs obligatoires encore vides. */
    public List<String> manquants(String structureJson, JsonNode valeurs)
    {
        List<String> manquants = new ArrayList<>();
        for (JsonNode bloc : champs(structureJson))
        {
            if (!bloc.path("obligatoire").asBoolean(false))
            {
                continue;
            }
            JsonNode v = valeurs.get(bloc.path("cle").asText());
            boolean vide = v == null || v.isNull() || (v.isTextual() && v.asText().isBlank()) || (v.isArray() && v.isEmpty());
            if (vide)
            {
                manquants.add(bloc.path("libelle").asText());
            }
        }
        return manquants;
    }

    /** Ajoute (ou remplace) les valeurs calculées par le serveur. */
    public void fusionnerAuto(ObjectNode valeurs, Map<String, String> auto)
    {
        Iterator<String> noms = valeurs.fieldNames();
        List<String> aRetirer = new ArrayList<>();
        while (noms.hasNext())
        {
            String nom = noms.next();
            if (nom.startsWith(PREFIXE_AUTO))
            {
                aRetirer.add(nom);
            }
        }
        valeurs.remove(aRetirer);
        auto.forEach(valeurs::put);
    }

    // ---------- Outils JSON ----------

    public JsonNode lire(String json)
    {
        try
        {
            return json == null || json.isBlank() ? mapper.createObjectNode() : mapper.readTree(json);
        }
        catch (JsonProcessingException e)
        {
            throw new BusinessException("Contenu JSON invalide.");
        }
    }

    public String ecrire(JsonNode noeud)
    {
        try
        {
            return mapper.writeValueAsString(noeud);
        }
        catch (JsonProcessingException e)
        {
            throw new IllegalStateException(e);
        }
    }

    private ArrayNode listeTextes(JsonNode source, int max, int longueur)
    {
        ArrayNode liste = mapper.createArrayNode();
        if (source != null && source.isArray())
        {
            for (JsonNode element : source)
            {
                String t = element.asText("").trim();
                if (!t.isEmpty() && liste.size() < max)
                {
                    liste.add(limiter(t, longueur));
                }
            }
        }
        return liste;
    }

    private static String texte(JsonNode noeud, int max, String nom)
    {
        String t = noeud == null ? "" : noeud.asText("").trim();
        if (t.isEmpty())
        {
            throw new BusinessException(nom + " obligatoire.");
        }
        return limiter(t, max);
    }

    static String limiter(String valeur, int max)
    {
        if (valeur == null)
        {
            return "";
        }
        return valeur.length() <= max ? valeur : valeur.substring(0, max);
    }
}
