import { useState } from 'react';
import { LuSearch, LuSend, LuStar } from 'react-icons/lu';
import { useGalerie } from './useGalerie';
import { iconeType } from '../regles';
import type { ModeleResume } from '../types';
import './galerie.css';

type Props = {
  patientId: number;
  serviceId: number | null;
  onCree: (documentId: string) => void;
};

/** Choix du modèle : favoris, modèles du service, document libre ; demande d'un modèle manquant. */
function GalerieModeles({ patientId, serviceId, onCree }: Props) {
  const g = useGalerie(patientId, serviceId);
  const [demande, setDemande] = useState(false);
  const [intitule, setIntitule] = useState('');
  const [details, setDetails] = useState('');
  const [envoyee, setEnvoyee] = useState(false);

  const choisir = async (m: ModeleResume) => {
    const id = await g.creer(m);
    if (id) onCree(id);
  };

  const envoyer = async () => {
    if (!intitule.trim()) return;
    if (await g.demander(intitule.trim(), details.trim())) {
      setEnvoyee(true);
      setDemande(false);
      setIntitule('');
      setDetails('');
    }
  };

  const grille = (titre: string, liste: ModeleResume[]) =>
    liste.length > 0 && (
      <section className="galerie-groupe">
        <h3>{titre}</h3>
        <div className="galerie-grille">
          {liste.map((m) => {
            const Icone = iconeType(m.type);
            return (
              <div key={m.id} className="galerie-carte">
                <button type="button" className="galerie-choisir" onClick={() => choisir(m)} disabled={g.creation !== null}>
                  <span className="galerie-icone"><Icone aria-hidden="true" /></span>
                  <span className="galerie-texte">
                    <strong>{m.nom}</strong>
                    <small>
                      {g.creation === m.id
                        ? 'Création…'
                        : m.libre
                          ? 'Sections libres'
                          : `${m.nombreChamps} champ${m.nombreChamps > 1 ? 's' : ''} à remplir · v${m.version}`}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`galerie-favori${m.favori ? ' actif' : ''}`}
                  aria-label={m.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-pressed={m.favori}
                  onClick={() => g.favori(m)}
                >
                  <LuStar aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );

  return (
    <div className="galerie">
      <div className="galerie-recherche">
        <LuSearch aria-hidden="true" />
        <input value={g.recherche} onChange={(e) => g.setRecherche(e.target.value)} placeholder="Rechercher un modèle" aria-label="Rechercher un modèle" />
      </div>
      {g.erreur && <div className="galerie-erreur" role="alert">{g.erreur}</div>}
      {g.chargement ? (
        <p className="galerie-info">Chargement des modèles…</p>
      ) : (
        <>
          {grille('Mes favoris', g.groupes.favoris)}
          {grille('Modèles du service', g.groupes.service)}
          {grille('Sans modèle', g.groupes.hopital)}
          {g.modeles.length > 0 && g.groupes.favoris.length + g.groupes.service.length + g.groupes.hopital.length === 0 && (
            <p className="galerie-info">Aucun modèle ne correspond à « {g.recherche} ».</p>
          )}
        </>
      )}

      <footer className="galerie-pied">
        {envoyee && <span className="galerie-succes">Demande envoyée au chef de service.</span>}
        {demande ? (
          <div className="galerie-demande">
            <input value={intitule} onChange={(e) => setIntitule(e.target.value)} placeholder="Modèle souhaité (ex. Compte rendu de césarienne)" aria-label="Modèle souhaité" />
            <textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Précisions (facultatif)" aria-label="Précisions" />
            <div>
              <button type="button" className="galerie-lien" onClick={() => setDemande(false)}>Annuler</button>
              <button type="button" className="galerie-bouton" onClick={envoyer} disabled={!intitule.trim()}>
                <LuSend aria-hidden="true" /> Envoyer la demande
              </button>
            </div>
          </div>
        ) : (
          <p className="galerie-info">
            Le modèle dont vous avez besoin n'existe pas ? Utilisez le « Document libre » ou{' '}
            <button type="button" className="galerie-lien" onClick={() => setDemande(true)}>demandez-le au chef de service</button>.
          </p>
        )}
      </footer>
    </div>
  );
}

export default GalerieModeles;
