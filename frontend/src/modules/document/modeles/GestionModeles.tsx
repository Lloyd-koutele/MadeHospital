import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuArchive, LuInbox, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import Modal from '@/shared/ui/Modal';
import { dateCourte, iconeType } from '../regles';
import type { DemandeModele } from '../types';
import { useGestionModeles } from './useGestionModeles';
import '../saisie/saisie.css';
import '../galerie/galerie.css';
import '@/modules/dossier-medical/dossier/dossierPatient.css';
import './modeles.css';

type Onglet = 'service' | 'demandes';

const STATUTS = { BROUILLON: 'Disponible', PUBLIE: 'Disponible', ARCHIVE: 'Archivé' } as const;

/** Espace du chef de service : modèles du service et demandes des médecins. */
function GestionModeles() {
  const navigate = useNavigate();
  const { services, chargement: chargementServices } = useServicesMedecin();
  const diriges = services.filter((s) => s.chef);
  const g = useGestionModeles();
  const [onglet, setOnglet] = useState<Onglet>('service');
  const [refus, setRefus] = useState<DemandeModele | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  if (!chargementServices && diriges.length === 0) {
    return (
      <main className="saisie-page">
        <div className="saisie-alerte">Vous n'êtes chef d'aucun service : les modèles sont gérés par le chef de chaque service.</div>
        <Link to="/medecin" className="saisie-retour">Retour à l'espace médecin</Link>
      </main>
    );
  }

  const nomService = (id: number | null) => diriges.find((s) => s.id === id)?.nom ?? '';

  return (
    <main className="saisie-page">
      <header className="saisie-entete">
        <div>
          <h1>Modèles de documents</h1>
          <p>Chef de service — {diriges.map((s) => s.nom).join(', ')}</p>
        </div>
        <div className="saisie-actions">
          <button type="button" className="saisie-bouton" onClick={() => navigate('/medecin/modeles/nouveau')}>
            <LuPlus aria-hidden="true" /> Nouveau modèle
          </button>
        </div>
      </header>

      {g.message && <div className="saisie-succes" role="status">{g.message}</div>}
      {g.erreur && <div className="saisie-erreur" role="alert">{g.erreur}</div>}

      <div className="dm-onglets" role="tablist">
        <button type="button" role="tab" aria-selected={onglet === 'service'} className={onglet === 'service' ? 'actif' : ''} onClick={() => setOnglet('service')}>
          <LuPencil aria-hidden="true" /> Modèles du service <span className="dm-compteur">{g.modelesService.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={onglet === 'demandes'} className={onglet === 'demandes' ? 'actif' : ''} onClick={() => setOnglet('demandes')}>
          <LuInbox aria-hidden="true" /> Demandes {g.demandesOuvertes > 0 && <span className="dm-compteur alerte">{g.demandesOuvertes}</span>}
        </button>
      </div>

      {g.chargement ? (
        <p className="saisie-info">Chargement…</p>
      ) : onglet === 'service' ? (
        g.modelesService.length === 0 ? (
          <div className="mo-vide">
            <p>Aucun modèle propre au service pour l'instant.</p>
            <p>Créez un modèle : il sera aussitôt proposé aux médecins du service.</p>
          </div>
        ) : (
          <ul className="docs-liste">
            {g.modelesService.map((m) => {
              const Icone = iconeType(m.type);
              return (
                <li key={m.id}>
                  <button type="button" className="docs-ouvrir" onClick={() => navigate(`/medecin/modeles/${m.id}`)}>
                    <span className="galerie-icone"><Icone aria-hidden="true" /></span>
                    <span className="docs-texte">
                      <strong>{m.nom}</strong>
                      <small>{m.typeLibelle} · {nomService(m.serviceId)} · v{m.version} · {m.nombreChamps} champ(s)</small>
                    </span>
                    <span className={`mo-statut ${m.statut === 'ARCHIVE' ? 'archive' : 'publie'}`}>{STATUTS[m.statut]}</span>
                  </button>
                  <div className="mo-actions-ligne">
                    {m.statut !== 'ARCHIVE' && (
                      <button type="button" title="Archiver" aria-label={`Archiver ${m.nom}`} onClick={() => g.archiver(m)}><LuArchive /></button>
                    )}
                    {m.statut !== 'ARCHIVE' && (
                      <button type="button" title="Supprimer" className="danger" aria-label={`Supprimer ${m.nom}`} onClick={() => g.supprimer(m)}><LuTrash2 /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : g.demandes.length === 0 ? (
        <div className="mo-vide"><p>Aucune demande de modèle.</p></div>
      ) : (
        <ul className="mo-demandes">
          {g.demandes.map((d) => (
            <li key={d.id} className={d.statut.toLowerCase()}>
              <div>
                <strong>{d.intitule}</strong>
                <small>
                  {d.demandeur} · {d.serviceNom} · {dateCourte(d.dateCreation)}
                  {d.structureProposee ? ' · structure proposée' : ''}
                </small>
                {d.details && <p>{d.details}</p>}
                {d.reponse && <p className="mo-reponse">Réponse : {d.reponse}</p>}
              </div>
              {d.statut === 'OUVERTE' ? (
                <div className="saisie-actions">
                  <button type="button" className="saisie-bouton" onClick={() => navigate(`/medecin/modeles/nouveau?serviceId=${d.serviceId}&demande=${d.id}&nom=${encodeURIComponent(d.intitule)}`)}>
                    <LuPlus aria-hidden="true" /> Créer le modèle
                  </button>
                  <button type="button" className="saisie-bouton secondaire" onClick={() => g.marquerTraitee(d, null)}>
                    Déjà disponible
                  </button>
                  <button type="button" className="saisie-bouton danger" onClick={() => { setRefus(d); setMotifRefus(''); }}>
                    <LuX aria-hidden="true" /> Refuser
                  </button>
                </div>
              ) : (
                <span className={`mo-statut ${d.statut === 'TRAITEE' ? 'publie' : 'archive'}`}>{d.statut === 'TRAITEE' ? 'Traitée' : 'Refusée'}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={refus !== null} onClose={() => setRefus(null)} title="Refuser la demande">
        <div className="saisie-modale">
          <label className="saisie-champ">
            <span className="saisie-libelle">Motif (transmis au médecin)</span>
            <textarea rows={3} value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} placeholder="Utilisez le modèle « Compte rendu opératoire »." />
          </label>
          <div className="saisie-modale-actions">
            <button type="button" className="saisie-bouton secondaire" onClick={() => setRefus(null)}>Annuler</button>
            <button type="button" className="saisie-bouton danger" onClick={async () => { if (refus && (await g.refuser(refus, motifRefus))) setRefus(null); }}>
              Refuser
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

export default GestionModeles;
