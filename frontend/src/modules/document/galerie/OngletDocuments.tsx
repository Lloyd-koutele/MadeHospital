import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFileDown, LuPlus } from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import GalerieModeles from './GalerieModeles';
import { documentsDuPatient, messageErreur, pdfMedecin } from '../api/documentService';
import { dateCourte, iconeType, LIBELLES_STATUTS } from '../regles';
import type { DocumentResume } from '../types';
import './galerie.css';
import '../saisie/saisie.css';

/** Onglet « Documents » du dossier patient : liste des documents et création à partir d'un modèle. */
function OngletDocuments({ patientId, nomPatient }: { patientId: number; nomPatient: string }) {
  const navigate = useNavigate();
  const { serviceActifId } = useServicesMedecin();
  const [documents, setDocuments] = useState<DocumentResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [galerie, setGalerie] = useState(false);

  useEffect(() => {
    let actif = true;
    documentsDuPatient(patientId)
      .then((d) => actif && setDocuments(d))
      .catch((e) => actif && setErreur(messageErreur(e, 'Documents indisponibles.')))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [patientId]);

  const pdf = async (id: string) => {
    try {
      await pdfMedecin(id);
    } catch (e) {
      setErreur(messageErreur(e, 'PDF indisponible.'));
    }
  };

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Documents médicaux</h2>
          <p>Comptes rendus, ordonnances, examens et hospitalisations</p>
        </div>
        <button type="button" className="dm-bouton-clair" onClick={() => setGalerie(true)}>
          <LuPlus aria-hidden="true" /> Nouveau document
        </button>
      </header>
      {erreur && <div className="saisie-erreur" role="alert">{erreur}</div>}
      {chargement ? (
        <p className="dm-vide">Chargement…</p>
      ) : documents.length === 0 ? (
        <p className="dm-vide">Aucun document pour ce patient dans vos services.</p>
      ) : (
        <ul className="docs-liste">
          {documents.map((d) => {
            const Icone = iconeType(d.type);
            return (
              <li key={d.id} className={d.type === 'RESULTAT_EXAMEN' ? 'examen' : ''}>
                <button type="button" className="docs-ouvrir" onClick={() => navigate(`/medecin/documents/${d.id}`)}>
                  <span className="galerie-icone"><Icone aria-hidden="true" /></span>
                  <span className="docs-texte">
                    <strong>{d.titre}</strong>
                    <small>
                      {d.numero ?? 'Sans numéro'} · {dateCourte(d.dateValidation ?? d.dateCreation)}
                      {d.auteurNom ? ` · ${d.auteurNom}` : ''}
                      {d.serviceNom ? ` · ${d.serviceNom}` : ''}
                    </small>
                  </span>
                  <span className={`saisie-statut statut-${d.statut.toLowerCase()}`}>{LIBELLES_STATUTS[d.statut]}</span>
                </button>
                <button type="button" className="saisie-icone" aria-label={`PDF de ${d.titre}`} onClick={() => pdf(d.id)}>
                  <LuFileDown />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={galerie} onClose={() => setGalerie(false)} title="Nouveau document" sousTitre={`Patient : ${nomPatient}`} large>
        {galerie && (
          <GalerieModeles patientId={patientId} serviceId={serviceActifId} onCree={(id) => navigate(`/medecin/documents/${id}`)} />
        )}
      </Modal>
    </section>
  );
}

export default OngletDocuments;
