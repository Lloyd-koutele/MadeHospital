import { useEffect, useRef } from 'react';
import { LuCalendarCheck, LuCirclePlus, LuUserSearch, LuX } from 'react-icons/lu';
import { useFormulairePlanification } from './useFormulairePlanification';
import { CRENEAUX_RAPIDES, DUREES, libelleDuree, MOTIFS_RAPIDES, type RendezVous } from './regles';
import type { NouveauRendezVous } from './planningApi';
import type { PatientAutorise } from './usePlanning';

type Props = {
  patients: PatientAutorise[];
  rendezVous: RendezVous[];
  serviceNom?: string | null;
  creer: (rdv: NouveauRendezVous, nomPatient: string) => Promise<string | null>;
};

const initiales = (p: PatientAutorise) => `${p.prenom?.[0] ?? ''}${p.nom?.[0] ?? ''}`.toUpperCase();

/** Carte « Planifier un rendez-vous ». Affichage uniquement : la logique est dans useFormulairePlanification. */
function FormulairePlanification({ patients, rendezVous, serviceNom, creer }: Props) {
  const f = useFormulairePlanification({ patients, rendezVous, creer });
  const zonePatient = useRef<HTMLDivElement>(null);

  const { setListeOuverte } = f;

  // Fermer la liste des patients au clic en dehors
  useEffect(() => {
    const fermer = (e: MouseEvent) => {
      if (zonePatient.current && !zonePatient.current.contains(e.target as Node)) setListeOuverte(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [setListeOuverte]);

  return (
    <aside className="rv-carte rv-formulaire-carte">
      <header className="rv-formulaire-entete">
        <div className="rv-titre-aide">
          <h2>Planifier un rendez-vous</h2>
          <span className="rv-aide" tabIndex={0} aria-label="Information">
            ?
            <span className="rv-bulle" role="tooltip">
              Vous ne pouvez planifier un rendez-vous qu'avec les patients dont vous êtes le médecin référent ou qui vous ont autorisé l'accès.
            </span>
          </span>
        </div>
        {serviceNom && <span className="rv-service">{serviceNom}</span>}
      </header>

      <form className="rv-formulaire" onSubmit={f.soumettre} autoComplete="off" noValidate>
        {f.erreur && (
          <div className="rv-erreur" role="alert">
            {f.erreur}
          </div>
        )}

        {/* Patient */}
        <div className="rv-champ" ref={zonePatient}>
          <div className="rv-libelle">
            <label htmlFor="rv-patient">
              Patient <span className="rv-requis">*</span>
            </label>
            {f.patient && <span className="rv-pastille-ok">Accès autorisé</span>}
          </div>
          <div className="rv-saisie">
            <LuUserSearch className="rv-saisie-icone" aria-hidden="true" />
            <input
              id="rv-patient"
              value={f.recherchePatient}
              onFocus={() => f.setListeOuverte(true)}
              onChange={(e) => f.setRecherchePatient(e.target.value)}
              placeholder="Rechercher un patient autorisé…"
            />
            {f.recherchePatient && (
              <button type="button" className="rv-effacer" onClick={f.effacerPatient} aria-label="Effacer le patient">
                <LuX />
              </button>
            )}
          </div>
          {f.listeOuverte && (
            <div className="rv-liste" role="listbox">
              {f.suggestions.length === 0 ? (
                <p className="rv-liste-vide">Aucun patient autorisé trouvé</p>
              ) : (
                f.suggestions.map((p) => (
                  <button key={p.id} type="button" role="option" aria-selected={f.patient?.id === p.id} onClick={() => f.choisirPatient(p)}>
                    <span className="rv-avatar">{initiales(p)}</span>
                    <span className="rv-liste-texte">
                      <strong>
                        {p.prenom} {p.nom}
                      </strong>
                      <small>
                        #{String(p.id).padStart(4, '0')}
                        {p.telephone ? ` · ${p.telephone}` : ''}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Date et heure */}
        <div className="rv-champ">
          <div className="rv-libelle">
            <span>
              Date et heure <span className="rv-requis">*</span>
            </span>
            {f.conflit && <span className="rv-pastille-alerte">Créneau déjà occupé</span>}
          </div>
          <div className="rv-date-heure">
            <input type="date" value={f.date} onChange={(e) => f.setDate(e.target.value)} aria-label="Date" />
            <input type="time" value={f.heure} onChange={(e) => f.setHeure(e.target.value)} aria-label="Heure" step={300} />
          </div>
          <div className="rv-rapides">
            <span>Rapide :</span>
            {CRENEAUX_RAPIDES.map((h) => (
              <button key={h} type="button" className={f.heure === h ? 'actif' : ''} onClick={() => f.setHeure(h)}>
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Durée */}
        <div className="rv-champ">
          <span className="rv-libelle">Durée</span>
          <div className="rv-segments" role="radiogroup" aria-label="Durée">
            {DUREES.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={f.duree === d} className={f.duree === d ? 'actif' : ''} onClick={() => f.setDuree(d)}>
                {libelleDuree(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Motif */}
        <div className="rv-champ">
          <label className="rv-libelle" htmlFor="rv-motif">
            <span>
              Motif du rendez-vous <span className="rv-requis">*</span>
            </span>
          </label>
          <div className="rv-motifs">
            {MOTIFS_RAPIDES.map((m) => (
              <button key={m} type="button" className={m === 'Urgence' ? 'urgence' : ''} onClick={() => f.setMotif(m)}>
                {m}
              </button>
            ))}
          </div>
          <textarea id="rv-motif" rows={2} value={f.motif} onChange={(e) => f.setMotif(e.target.value)} placeholder="Ex. Contrôle annuel et bilan…" />
        </div>

        {/* Notes */}
        <div className="rv-champ">
          <button type="button" className="rv-lien" onClick={f.basculerNotes}>
            <LuCirclePlus aria-hidden="true" /> {f.notesVisibles ? 'Masquer la note complémentaire' : 'Ajouter une note complémentaire (facultatif)'}
          </button>
          {f.notesVisibles && (
            <textarea rows={2} value={f.notes} onChange={(e) => f.setNotes(e.target.value)} placeholder="Précisions cliniques, préparation, examens à apporter…" />
          )}
        </div>

        <button type="submit" className="rv-bouton-principal rv-pleine-largeur" disabled={f.envoi}>
          <LuCalendarCheck aria-hidden="true" /> {f.envoi ? 'Planification…' : 'Planifier le rendez-vous'}
        </button>
      </form>
    </aside>
  );
}

export default FormulairePlanification;
