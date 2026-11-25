import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuArrowDown, LuArrowLeft, LuArrowUp, LuPlus, LuSave, LuTrash2 } from 'react-icons/lu';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import ApercuDocument from '../apercu/ApercuDocument';
import EditeurBloc from './EditeurBloc';
import { useEditeurModele } from './useEditeurModele';
import {
  ajouterBloc,
  ajouterZoneLibre,
  ajouterSection,
  deplacerBloc,
  deplacerSection,
  modifierBloc,
  renommerSection,
  retirerBloc,
  retirerSection,
} from './construction';
import { LIBELLES_TYPES } from '../regles';
import '../saisie/saisie.css';
import './modeles.css';

/** Éditeur de modèle du chef de service : sections, textes fixes, champs automatiques et champs à remplir. */
function EditeurModele() {
  const { id } = useParams();
  const [parametres] = useSearchParams();
  const navigate = useNavigate();
  const { services } = useServicesMedecin();
  const diriges = services.filter((s) => s.chef);
  const m = useEditeurModele({
    id: id && id !== 'nouveau' ? Number(id) : undefined,
    serviceId: parametres.get('serviceId') ? Number(parametres.get('serviceId')) : null,
    serviceParDefaut: diriges[0]?.id ?? null,
    demandeId: parametres.get('demande') ? Number(parametres.get('demande')) : null,
    nom: parametres.get('nom') ?? '',
  });

  const archive = m.resume?.statut === 'ARCHIVE';

  if (m.chargement) return <main className="saisie-page"><p className="saisie-info">Chargement du modèle…</p></main>;

  /** Un nouveau modèle prend son adresse définitive dès son premier enregistrement. */
  const allerAuModele = (r: { id: number } | null) => {
    if (r && (!id || id === 'nouveau')) navigate(`/medecin/modeles/${r.id}`, { replace: true });
  };
  const enregistrer = async () => allerAuModele(await m.enregistrer());

  return (
    <main className="saisie-page">
      <div className="saisie-haut">
        <Link to="/medecin/modeles" className="saisie-retour">
          <LuArrowLeft aria-hidden="true" /> Modèles du service
        </Link>
        {m.resume && (
          <span className="saisie-etat">
            {m.resume.statut === 'ARCHIVE' ? 'Archivé' : `Disponible · version ${m.resume.version}`}
          </span>
        )}
      </div>

      <header className="saisie-entete">
        <div className="mo-identite">
          <input className="saisie-titre-libre" value={m.nom} onChange={(e) => m.setNom(e.target.value)} placeholder="Nom du modèle" aria-label="Nom du modèle" disabled={archive} />
          <div className="mo-ligne">
            <label>
              Type de document
              <select value={m.type} onChange={(e) => m.setType(e.target.value)} disabled={archive}>
                {Object.entries(LIBELLES_TYPES).filter(([cle]) => cle !== 'DOCUMENT_LIBRE').map(([cle, libelle]) => (
                  <option key={cle} value={cle}>{libelle}</option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select value={m.serviceId ?? ''} onChange={(e) => m.setServiceId(Number(e.target.value))} disabled={Boolean(m.resume) || archive}>
                {diriges.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </label>
          </div>
          <input className="mo-description" value={m.description} onChange={(e) => m.setDescription(e.target.value)} placeholder="Description courte (affichée dans la galerie)" maxLength={500} disabled={archive} />
        </div>
        {!archive && (
          <div className="saisie-actions">
            <button type="button" className="saisie-bouton" onClick={enregistrer} disabled={m.enregistrement}>
              <LuSave aria-hidden="true" /> Enregistrer
            </button>
          </div>
        )}
      </header>

      {m.message && <div className="saisie-succes" role="status">{m.message}</div>}
      {m.erreur && <div className="saisie-erreur" role="alert">{m.erreur}</div>}

      <div className="saisie-grille">
        <div className="saisie-formulaire">
          {m.structure.sections.map((section, i) => (
            <fieldset key={i} className="saisie-section mo-section" disabled={archive}>
              <div className="mo-section-tete">
                <input value={section.titre} onChange={(e) => m.setStructure(renommerSection(m.structure, i, e.target.value))} aria-label="Titre de la section" />
                <div className="mo-bloc-outils">
                  <button type="button" aria-label="Monter la section" onClick={() => m.setStructure(deplacerSection(m.structure, i, -1))}><LuArrowUp /></button>
                  <button type="button" aria-label="Descendre la section" onClick={() => m.setStructure(deplacerSection(m.structure, i, 1))}><LuArrowDown /></button>
                  <button type="button" aria-label="Retirer la section" className="danger" onClick={() => m.setStructure(retirerSection(m.structure, i))}><LuTrash2 /></button>
                </div>
              </div>
              {section.blocs.map((b, j) => (
                <EditeurBloc
                  key={j}
                  bloc={b}
                  structure={m.structure}
                  nouveau={b.type === 'CHAMP' && !m.clesInitiales.has(b.cle)}
                  onChange={(nb) => m.setStructure(modifierBloc(m.structure, i, j, nb))}
                  onRetirer={() => m.setStructure(retirerBloc(m.structure, i, j))}
                  onMonter={() => m.setStructure(deplacerBloc(m.structure, i, j, -1))}
                  onDescendre={() => m.setStructure(deplacerBloc(m.structure, i, j, 1))}
                />
              ))}
              <div className="mo-ajouts">
                <button type="button" onClick={() => m.setStructure(ajouterBloc(m.structure, i, 'TEXTE'))}><LuPlus aria-hidden="true" /> Texte rédigé</button>
                <button type="button" onClick={() => m.setStructure(ajouterBloc(m.structure, i, 'CHAMP'))}><LuPlus aria-hidden="true" /> Champ à remplir</button>
                <button type="button" onClick={() => m.setStructure(ajouterZoneLibre(m.structure, i))}><LuPlus aria-hidden="true" /> Zone de texte libre</button>
                <button type="button" onClick={() => m.setStructure(ajouterBloc(m.structure, i, 'AUTO'))}><LuPlus aria-hidden="true" /> Champ automatique</button>
              </div>
            </fieldset>
          ))}
          {!archive && (
            <button type="button" className="saisie-ajout" onClick={() => m.setStructure(ajouterSection(m.structure))}>
              <LuPlus aria-hidden="true" /> Ajouter une section
            </button>
          )}
        </div>

        <aside className="saisie-apercu">
          <span className="saisie-apercu-titre">Aperçu pour les médecins</span>
          <ApercuDocument
            titre={m.nom || 'Nom du modèle'}
            type={m.type}
            structure={m.structure}
            valeurs={{}}
            serviceNom={diriges.find((s) => s.id === m.serviceId)?.nom}
            modeModele
          />
        </aside>
      </div>
    </main>
  );
}

export default EditeurModele;
