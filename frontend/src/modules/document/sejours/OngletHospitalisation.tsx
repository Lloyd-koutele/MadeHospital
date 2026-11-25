import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBedDouble, LuDoorOpen, LuFilePen, LuPlus } from 'react-icons/lu';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import {
  admettrePatient,
  creerDocument,
  declarerSortie,
  galerieModeles,
  messageErreur,
  sejoursDuPatient,
} from '../api/documentService';
import { dateHeure } from '../regles';
import type { Sejour } from '../types';
import './sejours.css';
import '../saisie/saisie.css';

/** Onglet « Hospitalisation » : admission, sortie et compte rendu d'hospitalisation de chaque séjour. */
function OngletHospitalisation({ patientId }: { patientId: number }) {
  const navigate = useNavigate();
  const { serviceActifId } = useServicesMedecin();
  const [sejours, setSejours] = useState<Sejour[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [admission, setAdmission] = useState(false);
  const [lit, setLit] = useState('');
  const [motif, setMotif] = useState('');

  useEffect(() => {
    let actif = true;
    sejoursDuPatient(patientId)
      .then((s) => actif && setSejours(s))
      .catch((e) => actif && setErreur(messageErreur(e, 'Séjours indisponibles.')))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [patientId]);

  const enCours = sejours.some((s) => s.enCours);

  const admettre = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const s = await admettrePatient(patientId, serviceActifId, lit.trim(), motif.trim());
      setSejours((liste) => [s, ...liste]);
      setAdmission(false);
      setLit('');
      setMotif('');
      setErreur('');
    } catch (err) {
      setErreur(messageErreur(err, 'Admission impossible.'));
    }
  };

  const sortie = async (s: Sejour) => {
    try {
      const maj = await declarerSortie(s.id);
      setSejours((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
    } catch (err) {
      setErreur(messageErreur(err, 'Sortie impossible.'));
    }
  };

  /** Compte rendu créé depuis le modèle d'hospitalisation du service. */
  const compteRendu = async (s: Sejour) => {
    try {
      const modeles = (await galerieModeles(serviceActifId)).filter((m) => m.type === 'COMPTE_RENDU_HOSPITALISATION');
      const modele = modeles[0];
      if (!modele) {
        setErreur("Le service n'a pas de modèle de compte rendu d'hospitalisation : demandez-le au chef de service.");
        return;
      }
      const d = await creerDocument(patientId, modele.id, serviceActifId, s.id);
      navigate(`/medecin/documents/${d.resume.id}`);
    } catch (err) {
      setErreur(messageErreur(err, 'Création du compte rendu impossible.'));
    }
  };

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Hospitalisations</h2>
          <p>Admissions, sorties et comptes rendus d'hospitalisation</p>
        </div>
        {!enCours && (
          <button type="button" className="dm-bouton-clair" onClick={() => setAdmission((a) => !a)}>
            <LuPlus aria-hidden="true" /> Déclarer une admission
          </button>
        )}
      </header>
      {erreur && <div className="saisie-erreur" role="alert">{erreur}</div>}

      {admission && (
        <form className="sejour-formulaire" onSubmit={admettre}>
          <label className="saisie-champ">
            <span className="saisie-libelle">Lit / chambre</span>
            <input value={lit} onChange={(e) => setLit(e.target.value)} maxLength={30} placeholder="12B" />
          </label>
          <label className="saisie-champ">
            <span className="saisie-libelle">Motif d'admission</span>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} />
          </label>
          <div className="saisie-modale-actions">
            <button type="button" className="saisie-bouton secondaire" onClick={() => setAdmission(false)}>Annuler</button>
            <button type="submit" className="saisie-bouton">Admettre dans mon service</button>
          </div>
        </form>
      )}

      {chargement ? (
        <p className="dm-vide">Chargement…</p>
      ) : sejours.length === 0 ? (
        <p className="dm-vide">Aucun séjour hospitalier pour ce patient.</p>
      ) : (
        <ul className="sejours-liste">
          {sejours.map((s) => (
            <li key={s.id} className={s.enCours ? 'en-cours' : ''}>
              <span className="sejour-icone"><LuBedDouble aria-hidden="true" /></span>
              <div className="sejour-texte">
                <strong>
                  {s.numero} · {s.serviceNom}
                  {s.lit ? ` · lit ${s.lit}` : ''}
                </strong>
                <small>
                  Entrée le {dateHeure(s.dateEntree)}
                  {s.dateSortie ? ` · sortie le ${dateHeure(s.dateSortie)}` : ' · en cours'}
                  {s.medecinNom ? ` · ${s.medecinNom}` : ''}
                </small>
                {s.motif && <small>Motif : {s.motif}</small>}
              </div>
              <div className="sejour-actions">
                {s.enCours && (
                  <button type="button" className="saisie-bouton secondaire" onClick={() => sortie(s)}>
                    <LuDoorOpen aria-hidden="true" /> Sortie
                  </button>
                )}
                <button type="button" className="saisie-bouton" onClick={() => compteRendu(s)}>
                  <LuFilePen aria-hidden="true" /> Compte rendu
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default OngletHospitalisation;
