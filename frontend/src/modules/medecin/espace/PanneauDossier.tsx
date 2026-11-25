import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuExternalLink, LuFilePen, LuKeyRound, LuX } from 'react-icons/lu';
import BadgeService from '@/modules/service-hospitalier/components/BadgeService';
import { ageDe, type PatientMedecin } from './useEspaceMedecin';
import { useDossierPatient } from './useDossierPatient';

type Props = {
  patient: PatientMedecin | null;
  onFermer: () => void;
  onGererAcces: (patientId: number) => void;
  onModifierDossier: (patientId: number) => void;
  onMessage: (message: string) => void;
};

const dateCourte = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/**
 * Panneau latéral du patient : résumé, saisie rapide d'une consultation, historique,
 * et accès au dossier médical complet (analyses, ordonnances, imagerie).
 */
function PanneauDossier({ patient, onFermer, onGererAcces, onModifierDossier, onMessage }: Props) {
  const navigate = useNavigate();
  const d = useDossierPatient(patient?.id ?? null, onMessage);

  useEffect(() => {
    if (!patient) return;
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [patient, onFermer]);

  if (!patient) return null;

  const age = ageDe(patient.dateNaissance);
  const dossier = patient.dossierMedical;
  const meta = [age != null ? `${age} ans` : null, dossier?.sexe, patient.telephone].filter(Boolean).join(' · ');

  return (
    <div className="em-voile" onClick={onFermer}>
      <aside className="em-panneau" onClick={(e) => e.stopPropagation()} aria-label={`Dossier de ${patient.prenom} ${patient.nom}`}>
        <header className="em-panneau-entete">
          <div>
            <div className="em-panneau-titre">
              <h2>
                {patient.prenom} {patient.nom}
              </h2>
              <span className="em-identifiant">#{String(patient.id).padStart(4, '0')}</span>
            </div>
            {meta && <p className="em-meta">{meta}</p>}
            {(dossier?.groupeSanguin || dossier?.poids || dossier?.taille) && (
              <p className="em-meta">
                {[dossier?.groupeSanguin && `Groupe ${dossier.groupeSanguin}`, dossier?.poids && `${dossier.poids} kg`, dossier?.taille && `${dossier.taille} cm`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {dossier?.contexte && <p className="em-alerte">{dossier.contexte}</p>}
          </div>
          <button type="button" className="em-fermer" onClick={onFermer} aria-label="Fermer">
            <LuX />
          </button>
        </header>

        <div className="em-panneau-actions">
          <button type="button" className="em-bouton em-bouton-principal" onClick={() => navigate(`/dossier-medical/${patient.id}`)}>
            <LuExternalLink aria-hidden="true" /> Ouvrir le dossier complet
          </button>
          <button type="button" className="em-bouton" onClick={() => onModifierDossier(patient.id)}>
            <LuFilePen aria-hidden="true" /> Modifier le dossier
          </button>
          <button type="button" className="em-bouton" onClick={() => onGererAcces(patient.id)}>
            <LuKeyRound aria-hidden="true" /> Gérer les accès
          </button>
        </div>

        <div className="em-panneau-corps">
          <form className="em-formulaire" onSubmit={d.enregistrer}>
            <h3>Nouvelle consultation</h3>
            {d.erreur && (
              <div className="em-erreur" role="alert">
                {d.erreur}
              </div>
            )}
            <label>
              Type de consultation *
              <input
                value={d.saisie.type}
                onChange={(e) => d.saisie.setType(e.target.value)}
                placeholder="Ex. Contrôle, urgence, suivi…"
              />
            </label>
            <label>
              Diagnostic et acte réalisé *
              <textarea
                rows={3}
                value={d.saisie.note}
                onChange={(e) => d.saisie.setNote(e.target.value)}
                placeholder="Ex. Détartrage complet, radiographie rétro-alvéolaire sur 46…"
              />
            </label>
            <label>
              Ordonnance (facultatif)
              <textarea
                rows={2}
                value={d.saisie.ordonnance}
                onChange={(e) => d.saisie.setOrdonnance(e.target.value)}
                placeholder="Ex. Paracétamol 1 g, 1 comprimé 3 fois par jour pendant 3 jours"
              />
            </label>
            <div className="em-formulaire-pied">
              <span className="em-discret">Analyses et imagerie : depuis le dossier complet.</span>
              <button type="submit" className="em-bouton em-bouton-principal" disabled={d.envoi}>
                {d.envoi ? 'Enregistrement…' : 'Valider la consultation'}
              </button>
            </div>
          </form>

          <section>
            <h3>Historique médical</h3>
            {d.chargement ? (
              <p className="em-discret">Chargement…</p>
            ) : d.historique.length === 0 ? (
              <p className="em-discret">Aucune consultation dans vos services pour ce patient.</p>
            ) : (
              <ul className="em-historique">
                {d.historique.map((c) => (
                  <li key={c.id}>
                    <div className="em-historique-entete">
                      <span>{dateCourte(c.dateCreation)}</span>
                      <BadgeService service={c.service} />
                    </div>
                    <strong>{c.type}</strong>
                    <p>{c.description}</p>
                    {c.nomMedecin && <span className="em-discret">Dr {c.nomMedecin}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export default PanneauDossier;
