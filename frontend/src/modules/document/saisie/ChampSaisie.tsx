import { LuPlus, LuTrash2 } from 'react-icons/lu';
import type { BlocChamp, References } from '../types';
import { ecartNorme } from '../regles';

type Props = {
  bloc: BlocChamp;
  valeur: any;
  onChange: (v: any) => void;
  references: References | null;
  desactive?: boolean;
};

/** Zone de saisie d'un champ du modèle, selon son type. */
function ChampSaisie({ bloc, valeur, onChange, references, desactive = false }: Props) {
  const id = `champ-${bloc.cle}`;
  const libelle = (
    <label htmlFor={id} className="saisie-libelle">
      {bloc.libelle}
      {bloc.obligatoire && <span className="saisie-obligatoire" aria-label="obligatoire"> *</span>}
      {bloc.unite && <small> ({bloc.unite})</small>}
    </label>
  );

  const phrases = bloc.phrases && bloc.phrases.length > 0 && !desactive && (
    <div className="saisie-phrases">
      {bloc.phrases.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(valeur ? `${valeur}${String(valeur).endsWith('\n') ? '' : ' '}${p}` : p)}
        >
          + {p}
        </button>
      ))}
    </div>
  );

  let zone: JSX.Element;
  switch (bloc.champ) {
    case 'TEXTE_LONG':
      zone = <textarea id={id} rows={4} value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive} />;
      break;
    case 'ZONE_LIBRE':
      zone = (
        <textarea
          id={id}
          rows={10}
          className="saisie-zone-libre"
          aria-label={bloc.libelle}
          placeholder="Rédigez ici…"
          value={valeur ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={desactive}
        />
      );
      break;
    case 'NOMBRE':
      zone = <input id={id} inputMode="decimal" value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive} />;
      break;
    case 'DATE':
      zone = <input id={id} type="date" value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive} />;
      break;
    case 'HEURE':
      zone = <input id={id} type="time" value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive} />;
      break;
    case 'CHOIX':
      zone = (
        <select id={id} value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive}>
          <option value="">Choisir…</option>
          {(bloc.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case 'CASE':
      return (
        <div className="saisie-champ saisie-case">
          <label>
            <input type="checkbox" checked={Boolean(valeur)} onChange={(e) => onChange(e.target.checked)} disabled={desactive} />
            {bloc.libelle}
          </label>
        </div>
      );
    case 'EQUIPE': {
      const choisis: string[] = Array.isArray(valeur) ? valeur : [];
      const equipe = references?.equipe ?? [];
      zone = (
        <div className="saisie-equipe" id={id}>
          {equipe.length === 0 && <span className="saisie-aide">Aucun autre médecin dans votre service.</span>}
          {equipe.map((nom) => (
            <label key={nom}>
              <input
                type="checkbox"
                checked={choisis.includes(nom)}
                disabled={desactive}
                onChange={(e) => onChange(e.target.checked ? [...choisis, nom] : choisis.filter((n) => n !== nom))}
              />
              {nom}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'TABLEAU': {
      const colonnes = bloc.colonnes ?? [];
      const lignes: Record<string, string>[] = Array.isArray(valeur) && valeur.length > 0 ? valeur : [{}];
      const normes = colonnes.some((c) => c.cle === 'normes') && colonnes.some((c) => c.cle === 'resultat');
      const modifier = (i: number, cle: string, v: string) =>
        onChange(lignes.map((l, j) => (j === i ? { ...l, [cle]: v } : l)));
      zone = (
        <div className="saisie-tableau-cadre">
          <table className="saisie-tableau" id={id}>
            <thead>
              <tr>
                {colonnes.map((c) => <th key={c.cle}>{c.libelle}</th>)}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, i) => {
                const ecart = normes ? ecartNorme(ligne.resultat, ligne.normes) : null;
                return (
                  <tr key={i}>
                    {colonnes.map((c) => (
                      <td key={c.cle}>
                        <input
                          value={ligne[c.cle] ?? ''}
                          aria-label={c.libelle}
                          className={c.cle === 'resultat' && ecart ? 'hors-norme' : ''}
                          disabled={desactive}
                          onChange={(e) => modifier(i, c.cle, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      {!desactive && (
                        <button type="button" className="saisie-icone" aria-label="Supprimer la ligne"
                          onClick={() => onChange(lignes.filter((_, j) => j !== i))}>
                          <LuTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!desactive && (
            <button type="button" className="saisie-ajout" onClick={() => onChange([...lignes, {}])}>
              <LuPlus aria-hidden="true" /> Ajouter une ligne
            </button>
          )}
        </div>
      );
      break;
    }
    case 'DOCUMENT_LIE': {
      const docs = (references?.documents ?? []).filter((d) => !bloc.typeLie || d.type === bloc.typeLie);
      zone = (
        <select id={id} value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive}>
          <option value="">{docs.length === 0 ? 'Aucun document disponible' : 'Aucun'}</option>
          {docs.map((d) => (
            <option key={d.id} value={d.id}>{d.libelle}</option>
          ))}
        </select>
      );
      break;
    }
    case 'IMAGES': {
      const choisies: string[] = Array.isArray(valeur) ? valeur : [];
      const images = references?.images ?? [];
      zone = (
        <div className="saisie-equipe" id={id}>
          {images.length === 0 && (
            <span className="saisie-aide">Aucune image pour ce patient : ajoutez-les depuis une consultation (fichiers DICOM acceptés).</span>
          )}
          {images.map((img) => (
            <label key={img.id}>
              <input
                type="checkbox"
                checked={choisies.includes(img.id)}
                disabled={desactive}
                onChange={(e) => onChange(e.target.checked ? [...choisies, img.id] : choisies.filter((n) => n !== img.id))}
              />
              {img.libelle}
            </label>
          ))}
        </div>
      );
      break;
    }
    default:
      zone = <input id={id} value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} disabled={desactive} />;
  }

  return (
    <div className="saisie-champ">
      {bloc.champ !== 'ZONE_LIBRE' && libelle}
      {bloc.aide && <span className="saisie-aide">{bloc.aide}</span>}
      {zone}
      {phrases}
    </div>
  );
}

export default ChampSaisie;
