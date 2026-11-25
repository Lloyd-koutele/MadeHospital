import { useEffect, useState } from 'react';
import {
  creerModele,
  lireModele,
  messageErreur,
  modifierModele,
  structureProposee,
  traiterDemande,
} from '../api/documentService';
import type { ModeleResume, Structure } from '../types';
import { structureVide } from './construction';

/**
 * serviceParDefaut : premier service dirigé, connu seulement une fois les services du médecin chargés
 * (après le premier rendu) ; utilisé tant que le chef n'a pas choisi de service.
 */
type Origine = {
  id?: number;
  serviceId?: number | null;
  serviceParDefaut?: number | null;
  demandeId?: number | null;
  nom?: string;
};

/** Édition d'un modèle par le chef de service : chargement et enregistrement (un modèle enregistré est aussitôt disponible). */
export function useEditeurModele(origine: Origine) {
  const [resume, setResume] = useState<ModeleResume | null>(null);
  const [nom, setNom] = useState(origine.nom ?? '');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('AUTRE');
  const [serviceId, setServiceId] = useState<number | null>(origine.serviceId ?? null);
  const [structure, setStructure] = useState<Structure>(structureVide());
  const [clesInitiales, setClesInitiales] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(Boolean(origine.id || origine.demandeId));
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    let actif = true;
    if (origine.id) {
      lireModele(origine.id)
        .then((m) => {
          if (!actif) return;
          setResume(m.resume);
          setNom(m.resume.nom);
          setDescription(m.resume.description ?? '');
          setType(m.resume.type);
          setServiceId(m.resume.serviceId);
          setStructure(m.structure);
          setClesInitiales(
            new Set(m.structure.sections.flatMap((s) => s.blocs).flatMap((b) => (b.type === 'CHAMP' ? [b.cle] : []))),
          );
        })
        .catch((e) => actif && setErreur(messageErreur(e, 'Modèle introuvable.')))
        .finally(() => actif && setChargement(false));
    } else if (origine.demandeId) {
      structureProposee(origine.demandeId)
        .then((s) => actif && s && setStructure(s))
        .catch(() => undefined)
        .finally(() => actif && setChargement(false));
    }
    return () => {
      actif = false;
    };
  }, [origine.id, origine.demandeId]);

  const serviceEffectif = serviceId ?? origine.serviceParDefaut ?? null;

  const requete = () => ({ serviceId: serviceEffectif, nom: nom.trim(), description: description.trim(), type, structure });

  const enregistrer = async (): Promise<ModeleResume | null> => {
    if (!nom.trim()) {
      setErreur('Le nom du modèle est obligatoire.');
      return null;
    }
    if (serviceEffectif === null) {
      setErreur('Choisissez le service du modèle.');
      return null;
    }
    setEnregistrement(true);
    setErreur('');
    try {
      const m = resume ? await modifierModele(resume.id, requete()) : await creerModele(requete());
      setResume(m.resume);
      setStructure(m.structure);
      setMessage(
        resume
          ? `Version ${m.resume.version} enregistrée : elle s'applique aux prochains documents.`
          : 'Modèle enregistré : il est disponible dans la galerie des médecins du service.',
      );
      if (!resume && origine.demandeId) {
        await traiterDemande(origine.demandeId, m.resume.id, '', false).catch(() => undefined);
      }
      return m.resume;
    } catch (e) {
      setErreur(messageErreur(e, 'Enregistrement impossible.'));
      return null;
    } finally {
      setEnregistrement(false);
    }
  };

  return {
    resume,
    nom,
    setNom,
    description,
    setDescription,
    type,
    setType,
    serviceId: serviceEffectif,
    setServiceId,
    structure,
    setStructure,
    clesInitiales,
    chargement,
    erreur,
    message,
    enregistrement,
    enregistrer,
  };
}
