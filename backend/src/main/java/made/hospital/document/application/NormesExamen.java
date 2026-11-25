package made.hospital.document.application;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Détection des valeurs hors norme d'un résultat d'examen.
 * Normes acceptées : « 0,70 - 1,10 », « 6 à 12 », « < 1,60 », « <= 5 », « > 60 ».
 * La même règle est appliquée par l'interface (affichage) et par le PDF.
 */
public final class NormesExamen
{

    public enum Ecart
    {
        BAS, HAUT
    }

    private static final Pattern NOMBRE = Pattern.compile("-?\\d+(?:\\.\\d+)?");
    private static final Pattern INTERVALLE = Pattern.compile("(-?\\d+(?:\\.\\d+)?)\\s*(?:-|–|à|a)\\s*(-?\\d+(?:\\.\\d+)?)");
    private static final Pattern BORNE = Pattern.compile("^\\s*(<=|>=|≤|≥|<|>)\\s*(-?\\d+(?:\\.\\d+)?)");

    private NormesExamen()
    {
    }

    public static Ecart ecart(String resultat, String normes)
    {
        Double valeur = nombre(resultat);
        if (valeur == null || normes == null)
        {
            return null;
        }
        String n = normes.replace(',', '.');
        Matcher borne = BORNE.matcher(n);
        if (borne.find())
        {
            double limite = Double.parseDouble(borne.group(2));
            return switch (borne.group(1))
            {
                case "<" -> valeur >= limite ? Ecart.HAUT : null;
                case "<=", "≤" -> valeur > limite ? Ecart.HAUT : null;
                case ">" -> valeur <= limite ? Ecart.BAS : null;
                default -> valeur < limite ? Ecart.BAS : null;
            };
        }
        Matcher intervalle = INTERVALLE.matcher(n);
        if (intervalle.find())
        {
            double min = Double.parseDouble(intervalle.group(1));
            double max = Double.parseDouble(intervalle.group(2));
            if (valeur < min)
            {
                return Ecart.BAS;
            }
            return valeur > max ? Ecart.HAUT : null;
        }
        return null;
    }

    private static Double nombre(String texte)
    {
        if (texte == null)
        {
            return null;
        }
        Matcher m = NOMBRE.matcher(texte.replace(',', '.').replace(" ", ""));
        return m.find() ? Double.valueOf(m.group()) : null;
    }
}
