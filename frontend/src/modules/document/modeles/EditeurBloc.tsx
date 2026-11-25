import { LuArrowDown, LuArrowUp, LuLock, LuLockOpen, LuTrash2 } from 'react-icons/lu';
import type { Bloc, Structure, TypeChamp } from '../types';
import { LIBELLES_CHAMPS, LIBELLES_TYPES, SOURCES_AUTO } from '../regles';
import { changerTypeChamp, colonnesDepuisTexte, lignes, renommerChamp } from './construction';

type Props = {
  bloc: Bloc;
  structure: Structure;
  nouveau: boolean;
  onChange: (b: Bloc) => void;
  onRetirer: () => void;
  onMonter: () => void;
  onDescendre: () => void;
};

// la zone libre a son propre bouton : elle n'est pas proposée comme type d'un champ titré
const TYPES_CHAMPS = (Object.keys(LIBELLES_CHAMPS) as TypeChamp[]).filter((t) => t !== 'ZONE_LIBRE');

/** Réglages d'un élément du modèle : texte fixe, champ automatique ou champ à saisir. */
function EditeurBloc({ bloc, structure, nouveau, onChange, onRetirer, onMonter, onDescendre }: Props) {
  const outils = (
    <div className="mo-bloc-outils">
      <button type="button" aria-label="Monter" onClick={onMonter}><LuArrowUp /></button>
      <button type="button" aria-label="Descendre" onClick={onDescendre}><LuArrowDown /></button>
      <button type="button" aria-label="Retirer" className="danger" onClick={onRetirer}><LuTrash2 /></button>
    </div>
  );

  if (bloc.type === 'TEXTE') {
    return (
      <div className="mo-bloc texte">
        <div className="mo-bloc-tete">
          <span className="mo-etiquette">Texte déjà rédigé</span>
          {outils}
        </div>
        <textarea rows={3} value={bloc.texte} onChange={(e) => onChange({ ...bloc, texte: e.target.value })} placeholder="Texte standard (protocole, mentions…)" />
        <label className="mo-case">
          <input type="checkbox" checked={bloc.verrouille} onChange={(e) => onChange({ ...bloc, verrouille: e.target.checked })} />
          {bloc.verrouille ? <LuLock aria-hidden="true" /> : <LuLockOpen aria-hidden="true" />}
          {bloc.verrouille ? 'Verrouillé : le médecin ne peut pas le modifier' : 'Modifiable par le médecin'}
        </label>
      </div>
    );
  }

  if (bloc.type === 'AUTO') {
    return (
      <div className="mo-bloc auto">
        <div className="mo-bloc-tete">
          <span className="mo-etiquette">Rempli automatiquement</span>
          {outils}
        </div>
        <div className="mo-ligne">
          <label>
            Donnée
            <select value={bloc.source} onChange={(e) => onChange({ ...bloc, source: e.target.value, libelle: bloc.libelle || SOURCES_AUTO[e.target.value] })}>
              {Object.entries(SOURCES_AUTO).map(([cle, libelle]) => (
                <option key={cle} value={cle}>{libelle}</option>
              ))}
            </select>
          </label>
          <label>
            Libellé affiché
            <input value={bloc.libelle} onChange={(e) => onChange({ ...bloc, libelle: e.target.value })} />
          </label>
        </div>
      </div>
    );
  }

  if (bloc.champ === 'ZONE_LIBRE') {
    return (
      <div className="mo-bloc champ">
        <div className="mo-bloc-tete">
          <span className="mo-etiquette">Zone de texte libre</span>
          {outils}
        </div>
        <p className="mo-explication">Grand texte sans titre : le médecin y rédige librement le contenu du document.</p>
        <label className="mo-case">
          <input type="checkbox" checked={bloc.obligatoire} onChange={(e) => onChange({ ...bloc, obligatoire: e.target.checked })} />
          Obligatoire
        </label>
        <label>
          Phrases types (une par ligne, insérées en un clic)
          <textarea rows={2} value={(bloc.phrases ?? []).join('\n')} onChange={(e) => onChange({ ...bloc, phrases: lignes(e.target.value) })} />
        </label>
      </div>
    );
  }

  return (
    <div className="mo-bloc champ">
      <div className="mo-bloc-tete">
        <span className="mo-etiquette">Champ à remplir</span>
        {outils}
      </div>
      <div className="mo-ligne">
        <label>
          Libellé
          <input value={bloc.libelle} onChange={(e) => onChange(renommerChamp(structure, bloc, e.target.value, nouveau))} />
        </label>
        <label>
          Type
          <select value={bloc.champ} onChange={(e) => onChange(changerTypeChamp(bloc, e.target.value as TypeChamp))}>
            {TYPES_CHAMPS.map((t) => (
              <option key={t} value={t}>{LIBELLES_CHAMPS[t]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mo-ligne">
        <label className="mo-case">
          <input type="checkbox" checked={bloc.obligatoire} onChange={(e) => onChange({ ...bloc, obligatoire: e.target.checked })} />
          Obligatoire
        </label>
        {bloc.champ === 'NOMBRE' && (
          <label>
            Unité
            <input value={bloc.unite ?? ''} maxLength={20} onChange={(e) => onChange({ ...bloc, unite: e.target.value })} placeholder="mmHg, kg, min…" />
          </label>
        )}
        {bloc.champ === 'DOCUMENT_LIE' && (
          <label>
            Type de document
            <select value={bloc.typeLie ?? ''} onChange={(e) => onChange({ ...bloc, typeLie: e.target.value || undefined })}>
              <option value="">Tous</option>
              {Object.entries(LIBELLES_TYPES).map(([cle, libelle]) => (
                <option key={cle} value={cle}>{libelle}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {bloc.champ === 'CHOIX' && (
        <label>
          Choix proposés (un par ligne)
          <textarea rows={3} value={(bloc.options ?? []).join('\n')} onChange={(e) => onChange({ ...bloc, options: lignes(e.target.value) })} />
        </label>
      )}
      {bloc.champ === 'TABLEAU' && (
        <label>
          Colonnes (une par ligne ; « Résultat » et « Normes » signalent les valeurs hors norme)
          <textarea
            rows={3}
            defaultValue={(bloc.colonnes ?? []).map((c) => c.libelle).join('\n')}
            onBlur={(e) => onChange({ ...bloc, colonnes: colonnesDepuisTexte(e.target.value) })}
          />
        </label>
      )}
      {['TEXTE_COURT', 'TEXTE_LONG'].includes(bloc.champ) && (
        <label>
          Phrases types (une par ligne, insérées en un clic)
          <textarea rows={2} value={(bloc.phrases ?? []).join('\n')} onChange={(e) => onChange({ ...bloc, phrases: lignes(e.target.value) })} />
        </label>
      )}
      <label>
        Aide pour le médecin (facultatif)
        <input value={bloc.aide ?? ''} maxLength={300} onChange={(e) => onChange({ ...bloc, aide: e.target.value || undefined })} />
      </label>
    </div>
  );
}

export default EditeurBloc;
