import { LogoHopital, useEtablissement } from '@/modules/etablissement';
import type { Bloc, BlocAuto, BlocChamp, StatutDocument, Structure, Valeurs } from '../types';
import { commenceParIdentite, dateHeure, dateIso, ecartNorme, estVide, grouperBlocs, LIBELLES_STATUTS } from '../regles';
import './apercu.css';

type Props = {
  titre: string;
  type: string;
  structure: Structure;
  valeurs: Valeurs;
  serviceNom?: string | null;
  numero?: string | null;
  statut?: StatutDocument;
  date?: string | null;
  auteur?: string | null;
  /** Modèle vu par le chef : les champs vides apparaissent comme des zones à remplir. */
  modeModele?: boolean;
};

/** Aperçu du document tel qu'il sera imprimé (même mise en page que le PDF). */
function ApercuDocument({ titre, type, structure, valeurs, serviceNom, numero, statut, date, auteur, modeModele = false }: Props) {
  const { identite } = useEtablissement();
  const examen = type === 'RESULTAT_EXAMEN';

  return (
    <article className={`apercu-doc${examen ? ' examen' : ''}`}>
      <header className="apercu-entete">
        <LogoHopital taille={46} />
        <div>
          <strong>{identite.nom}</strong>
          {serviceNom && <small>Service : {serviceNom}</small>}
        </div>
      </header>
      <h2 className="apercu-titre">{titre}</h2>
      <div className="apercu-meta">
        {modeModele ? 'Modèle' : numero ? `N° ${numero}` : 'Numéro attribué à la validation'}
        {date && ` · ${dateHeure(date)}`}
        {statut && statut !== 'BROUILLON' && !modeModele && <span className="apercu-statut">{LIBELLES_STATUTS[statut]}</span>}
      </div>

      {structure.sections.map((section, i) => (
        <section key={i} className="apercu-section">
          {!commenceParIdentite(section.blocs) && <h3>{section.titre}</h3>}
          {grouperBlocs(section.blocs).map((g) =>
            'auto' in g ? (
              <Identite key={`a${g.debut}`} blocs={g.auto} valeurs={valeurs} modeModele={modeModele} />
            ) : (
              <BlocApercu key={g.index} bloc={g.bloc} valeurs={valeurs} modeModele={modeModele} />
            ),
          )}
        </section>
      ))}

      <footer className="apercu-pied">
        <div>
          <b>{auteur ?? (modeModele ? 'Médecin (auteur)' : '')}</b>
          <br />
          {statut === 'VALIDE' || statut === 'RECTIFIE'
            ? 'Signé électroniquement · QR code de vérification sur le PDF'
            : modeModele
              ? 'Signature électronique à la validation'
              : 'Sans valeur tant qu’il n’est pas validé'}
        </div>
      </footer>
    </article>
  );
}

/** Données automatiques consécutives, deux par ligne. */
function Identite({ blocs, valeurs, modeModele }: { blocs: BlocAuto[]; valeurs: Valeurs; modeModele: boolean }) {
  return (
    <div className="apercu-identite">
      {blocs.map((b, j) => (
        <span key={j}>
          <b>{b.libelle} :</b> {modeModele ? <em className="apercu-auto">automatique</em> : valeurs[`@${b.source}`] || '—'}
        </span>
      ))}
    </div>
  );
}

function BlocApercu({ bloc, valeurs, modeModele }: { bloc: Bloc; valeurs: Valeurs; modeModele: boolean }) {
  if (bloc.type === 'TEXTE') {
    const texte = bloc.verrouille || modeModele ? bloc.texte : valeurs[bloc.cle ?? ''] ?? '';
    return texte ? <p className={`apercu-texte${modeModele && bloc.verrouille ? ' verrouille' : ''}`}>{texte}</p> : null;
  }
  if (bloc.type === 'AUTO') {
    return (
      <div className="apercu-champ">
        <b>{bloc.libelle} :</b> {modeModele ? <em className="apercu-auto">automatique</em> : valeurs[`@${bloc.source}`] || '—'}
      </div>
    );
  }
  return <ChampApercu bloc={bloc} valeurs={valeurs} modeModele={modeModele} />;
}

function ChampApercu({ bloc, valeurs, modeModele }: { bloc: BlocChamp; valeurs: Valeurs; modeModele: boolean }) {
  const v = valeurs[bloc.cle];
  if (bloc.champ === 'ZONE_LIBRE') {
    if (estVide(v)) return modeModele ? <div className="apercu-zone-libre">Zone de texte libre</div> : null;
    return <p className="apercu-multiligne apercu-zone-texte">{String(v)}</p>;
  }
  if (estVide(v)) {
    return modeModele ? (
      <div className="apercu-champ">
        <b>{bloc.libelle}{bloc.obligatoire ? ' *' : ''} :</b> <span className="apercu-zone">{bloc.champ === 'TABLEAU' ? 'tableau à remplir' : 'à remplir'}</span>
      </div>
    ) : null;
  }
  if (bloc.champ === 'TABLEAU') {
    const colonnes = bloc.colonnes ?? [];
    const normes = colonnes.some((c) => c.cle === 'normes') && colonnes.some((c) => c.cle === 'resultat');
    return (
      <table className="apercu-tableau">
        <thead>
          <tr>{colonnes.map((c) => <th key={c.cle}>{c.libelle}</th>)}</tr>
        </thead>
        <tbody>
          {(v as Record<string, string>[]).map((ligne, i) => {
            const ecart = normes ? ecartNorme(ligne.resultat, ligne.normes) : null;
            return (
              <tr key={i}>
                {colonnes.map((c) => (
                  <td key={c.cle} className={c.cle === 'resultat' && ecart ? 'hors-norme' : ''}>
                    {ligne[c.cle]}
                    {c.cle === 'resultat' && ecart ? (ecart === 'HAUT' ? ' ↑' : ' ↓') : ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  if (bloc.champ === 'CASE' && !v) return null;
  let texte: string;
  switch (bloc.champ) {
    case 'NOMBRE':
      texte = `${v}${bloc.unite ? ` ${bloc.unite}` : ''}`;
      break;
    case 'DATE':
      texte = dateIso(String(v));
      break;
    case 'CASE':
      texte = 'Oui';
      break;
    case 'EQUIPE':
      texte = (v as string[]).join(', ');
      break;
    case 'DOCUMENT_LIE':
    case 'IMAGES':
      texte = valeurs[`@affichage.${bloc.cle}`] || 'Sélectionné (libellé après enregistrement)';
      break;
    default:
      texte = String(v);
  }
  if (bloc.champ === 'TEXTE_LONG') {
    return (
      <div className="apercu-champ">
        <b className="bloc">{bloc.libelle}</b>
        <span className="apercu-multiligne">{texte}</span>
      </div>
    );
  }
  return (
    <div className="apercu-champ">
      <b>{bloc.libelle} :</b> {texte}
    </div>
  );
}

export default ApercuDocument;
