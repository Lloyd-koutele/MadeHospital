import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuFileDown,
  LuLightbulb,
  LuLock,
  LuPenLine,
  LuPlus,
  LuSave,
  LuTrash2,
} from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import ApercuDocument from '../apercu/ApercuDocument';
import ChampSaisie from './ChampSaisie';
import { useEditeurDocument } from './useEditeurDocument';
import { grouperBlocs, LIBELLES_STATUTS, sectionIdentite } from '../regles';
import type { Structure } from '../types';
import './saisie.css';

/**
 * Saisie d'un document : le médecin ne remplit que les zones vides, l'aperçu montre le document final.
 */
function EditeurDocument() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const e = useEditeurDocument(id);
  const [confirmation, setConfirmation] = useState<'supprimer' | null>(null);
  const [proposition, setProposition] = useState(false);
  const [intitule, setIntitule] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');

  if (e.etat === 'chargement') return <main className="saisie-page"><p className="saisie-info">Chargement du document…</p></main>;
  if (!e.document || !e.structure) {
    return (
      <main className="saisie-page">
        <div className="saisie-erreur" role="alert">{e.erreur || 'Document introuvable.'}</div>
        <Link to="/medecin">Retour</Link>
      </main>
    );
  }

  const d = e.document;
  const modifiable = d.modifiable;
  const libre = e.structure.libre;
  const retourDossier = `/dossier-medical/${d.patientId}?onglet=documents`;

  const majSection = (i: number, titre: string) => {
    const s: Structure = { ...e.structure!, sections: e.structure!.sections.map((x, j) => (j === i ? { ...x, titre } : x)) };
    e.changerStructureLibre(s);
  };
  const ajouterSection = () => {
    const n = e.structure!.sections.length + 1;
    e.changerStructureLibre({
      ...e.structure!,
      sections: [
        ...e.structure!.sections,
        { titre: `Section ${n}`, blocs: [{ type: 'CHAMP', cle: `section_${n}`, libelle: `Section ${n}`, champ: 'TEXTE_LONG', obligatoire: false }] },
      ],
    });
  };
  const retirerSection = (i: number) => {
    // Les clés sont renumérotées par le serveur : on recopie les textes dans l'ordre
    const restantes = e.structure!.sections.filter((_, j) => j !== i);
    const textes = e.structure!.sections.map((_, j) => e.valeurs[`section_${j + 1}`]).filter((_, j) => j !== i);
    restantes.forEach((_, j) => e.changer(`section_${j + 1}`, textes[j] ?? ''));
    e.changer(`section_${e.structure!.sections.length}`, '');
    e.changerStructureLibre({
      ...e.structure!,
      sections: restantes.map((s, j) => ({
        ...s,
        blocs: [{ type: 'CHAMP', cle: `section_${j + 1}`, libelle: s.titre, champ: 'TEXTE_LONG', obligatoire: false }],
      })),
    });
  };

  /** Enregistre le document définitivement : numéroté, signé et verrouillé, sans confirmation supplémentaire. */
  const valider = async () => {
    if (await e.valider()) setMessage('Document enregistré et signé.');
  };
  const supprimer = async () => {
    setConfirmation(null);
    if (await e.supprimer()) navigate(retourDossier, { replace: true });
  };
  const rectifier = async () => {
    const nouvel = await e.rectifier();
    if (nouvel) navigate(`/medecin/documents/${nouvel}`);
  };
  const proposer = async () => {
    if (!intitule.trim()) return;
    if (await e.proposer(intitule.trim(), details.trim())) {
      setProposition(false);
      setMessage('Proposition envoyée au chef de service (sans aucune donnée du patient).');
    }
  };

  return (
    <main className="saisie-page">
      <div className="saisie-haut">
        <Link to={retourDossier} className="saisie-retour">
          <LuArrowLeft aria-hidden="true" /> Dossier du patient
        </Link>
        <span className={`saisie-etat ${e.etat}`}>
          {modifiable ? (e.etat === 'enregistrement' ? 'Enregistrement…' : e.modifie ? 'Modifications non enregistrées' : 'Brouillon enregistré') : ''}
        </span>
      </div>

      <header className="saisie-entete">
        <div>
          {modifiable && libre ? (
            <input className="saisie-titre-libre" value={e.titre} onChange={(ev) => e.changerTitre(ev.target.value)} aria-label="Titre du document" />
          ) : (
            <h1>{e.titre}</h1>
          )}
          <p>
            <span className={`saisie-statut statut-${d.resume.statut.toLowerCase()}`}>{LIBELLES_STATUTS[d.resume.statut]}</span>
            {d.resume.numero && <span> N° {d.resume.numero}</span>}
            {d.resume.serviceNom && <span> · {d.resume.serviceNom}</span>}
          </p>
        </div>
        <div className="saisie-actions">
          <button type="button" className="saisie-bouton secondaire" onClick={e.pdf}>
            <LuFileDown aria-hidden="true" /> PDF
          </button>
          {modifiable && libre && (
            <button type="button" className="saisie-bouton secondaire" onClick={() => setProposition(true)}>
              <LuLightbulb aria-hidden="true" /> Proposer comme modèle
            </button>
          )}
          {modifiable && (
            <>
              <button type="button" className="saisie-bouton danger" onClick={() => setConfirmation('supprimer')}>
                <LuTrash2 aria-hidden="true" /> Supprimer
              </button>
              <button type="button" className="saisie-bouton" onClick={valider}>
                <LuSave aria-hidden="true" /> Enregistrer
              </button>
            </>
          )}
          {d.rectifiable && (
            <button type="button" className="saisie-bouton" onClick={rectifier}>
              <LuPenLine aria-hidden="true" /> Rectifier
            </button>
          )}
        </div>
      </header>

      {message && <div className="saisie-succes" role="status">{message}</div>}
      {e.erreur && <div className="saisie-erreur" role="alert">{e.erreur}</div>}
      {d.resume.statut === 'RECTIFIE' && (
        <div className="saisie-alerte">Ce document a été remplacé par une version rectifiée.</div>
      )}

      <div className="saisie-grille">
        <form className="saisie-formulaire" onSubmit={(ev) => ev.preventDefault()}>
          {e.structure.sections.map((section, i) =>
            sectionIdentite(section.blocs) ? (
              <fieldset key={i} className="saisie-section identite">
                <legend>{section.titre}</legend>
                <div className="saisie-auto">
                  {section.blocs.map((b, j) =>
                    b.type === 'AUTO' ? (
                      <span key={j}>
                        <small>{b.libelle}</small>
                        {e.valeurs[`@${b.source}`] || '—'}
                      </span>
                    ) : null,
                  )}
                </div>
              </fieldset>
            ) : (
              <fieldset key={i} className="saisie-section">
                {libre && modifiable ? (
                  <div className="saisie-section-libre">
                    <input value={section.titre} onChange={(ev) => majSection(i, ev.target.value)} aria-label="Titre de la section" />
                    {e.structure!.sections.length > 1 && (
                      <button type="button" className="saisie-icone" aria-label="Retirer la section" onClick={() => retirerSection(i)}>
                        <LuTrash2 />
                      </button>
                    )}
                  </div>
                ) : (
                  <legend>{section.titre}</legend>
                )}
                {grouperBlocs(section.blocs).map((g) => {
                  if ('auto' in g) {
                    return (
                      <div key={`a${g.debut}`} className="saisie-auto groupe">
                        {g.auto.map((b, k) => (
                          <span key={k}>
                            <small>{b.libelle}</small>
                            {e.valeurs[`@${b.source}`] || '—'}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  const { bloc: b, index: j } = g;
                  if (b.type === 'AUTO') return null; // déjà regroupé ci-dessus
                  if (b.type === 'TEXTE') {
                    return b.verrouille ? (
                      <p key={j} className="saisie-texte-fixe">
                        <LuLock aria-hidden="true" /> {b.texte}
                      </p>
                    ) : (
                      <div key={j} className="saisie-champ">
                        <span className="saisie-libelle">Texte (modifiable)</span>
                        <textarea
                          rows={3}
                          value={e.valeurs[b.cle ?? ''] ?? ''}
                          onChange={(ev) => e.changer(b.cle ?? '', ev.target.value)}
                          disabled={!modifiable}
                        />
                      </div>
                    );
                  }
                  return (
                    <ChampSaisie
                      key={j}
                      bloc={libre ? { ...b, libelle: 'Contenu' } : b}
                      valeur={e.valeurs[b.cle]}
                      onChange={(v) => e.changer(b.cle, v)}
                      references={e.references}
                      desactive={!modifiable}
                    />
                  );
                })}
              </fieldset>
            ),
          )}
          {libre && modifiable && (
            <button type="button" className="saisie-ajout" onClick={ajouterSection}>
              <LuPlus aria-hidden="true" /> Ajouter une section
            </button>
          )}
        </form>

        <aside className="saisie-apercu">
          <span className="saisie-apercu-titre">Aperçu du document</span>
          <ApercuDocument
            titre={e.titre}
            type={d.resume.type}
            structure={e.structure}
            valeurs={e.valeurs}
            serviceNom={d.resume.serviceNom}
            numero={d.resume.numero}
            statut={d.resume.statut}
            date={d.resume.dateValidation ?? d.resume.dateCreation}
            auteur={d.resume.auteurNom}
          />
        </aside>
      </div>

      <Modal isOpen={confirmation === 'supprimer'} onClose={() => setConfirmation(null)} title="Supprimer le brouillon">
        <div className="saisie-modale">
          <p>Ce brouillon sera supprimé définitivement.</p>
          <div className="saisie-modale-actions">
            <button type="button" className="saisie-bouton secondaire" onClick={() => setConfirmation(null)}>Annuler</button>
            <button type="button" className="saisie-bouton danger" onClick={supprimer}>
              <LuTrash2 aria-hidden="true" /> Supprimer
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={proposition} onClose={() => setProposition(false)} title="Proposer comme modèle">
        <div className="saisie-modale">
          <p>
            Le chef de service recevra seulement les titres de vos sections, sans aucune donnée du patient. Il pourra
            les compléter et enregistrer le modèle pour le service.
          </p>
          <label className="saisie-champ">
            <span className="saisie-libelle">Nom du modèle souhaité *</span>
            <input value={intitule} onChange={(ev) => setIntitule(ev.target.value)} placeholder="Compte rendu de césarienne" />
          </label>
          <label className="saisie-champ">
            <span className="saisie-libelle">Précisions</span>
            <textarea rows={3} value={details} onChange={(ev) => setDetails(ev.target.value)} />
          </label>
          <div className="saisie-modale-actions">
            <button type="button" className="saisie-bouton secondaire" onClick={() => setProposition(false)}>Annuler</button>
            <button type="button" className="saisie-bouton" onClick={proposer} disabled={!intitule.trim()}>Envoyer</button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

export default EditeurDocument;
