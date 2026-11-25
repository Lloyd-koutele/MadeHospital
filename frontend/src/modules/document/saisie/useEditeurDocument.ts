import { useCallback, useEffect, useRef, useState } from 'react';
import {
  enregistrerDocument,
  lireDocument,
  messageErreur,
  pdfMedecin,
  proposerCommeModele,
  rectifierDocument,
  referencesDuPatient,
  supprimerBrouillon,
  validerDocument,
} from '../api/documentService';
import type { DocumentDetail, References, Structure, Valeurs } from '../types';
import { champsManquants } from '../regles';

const DELAI_SAUVEGARDE = 1500;

/**
 * Saisie d'un document : chargement, enregistrement automatique du brouillon,
 * validation (signature), rectification, PDF et proposition comme modèle.
 */
export function useEditeurDocument(id: string) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [valeurs, setValeurs] = useState<Valeurs>({});
  const [structure, setStructure] = useState<Structure | null>(null);
  const [titre, setTitre] = useState('');
  const [references, setReferences] = useState<References | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'enregistrement' | 'enregistre' | 'erreur'>('chargement');
  const [erreur, setErreur] = useState('');
  const [modifie, setModifie] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appliquer = (d: DocumentDetail) => {
    setDocument(d);
    setValeurs(d.valeurs ?? {});
    setStructure(d.structure);
    setTitre(d.resume.titre);
    setModifie(false);
  };

  useEffect(() => {
    let actif = true;
    setEtat('chargement');
    lireDocument(id)
      .then((d) => {
        if (!actif) return;
        appliquer(d);
        setEtat('pret');
        const besoinReferences = d.structure.sections.some((s) =>
          s.blocs.some((b) => b.type === 'CHAMP' && ['DOCUMENT_LIE', 'IMAGES', 'EQUIPE'].includes(b.champ)),
        );
        if (besoinReferences) {
          referencesDuPatient(d.patientId, d.serviceId).then((r) => actif && setReferences(r)).catch(() => undefined);
        }
      })
      .catch((e) => {
        if (!actif) return;
        setErreur(messageErreur(e, 'Document introuvable.'));
        setEtat('erreur');
      });
    return () => {
      actif = false;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [id]);

  const enregistrer = useCallback(async (): Promise<DocumentDetail | null> => {
    if (!document || !document.modifiable) return document;
    if (minuteur.current) clearTimeout(minuteur.current);
    setEtat('enregistrement');
    try {
      const d = await enregistrerDocument(id, valeurs, titre, structure?.libre ? structure : undefined);
      setDocument(d);
      setValeurs((avant) => ({ ...avant, ...Object.fromEntries(Object.entries(d.valeurs).filter(([k]) => k.startsWith('@'))) }));
      setModifie(false);
      setEtat('enregistre');
      setErreur('');
      return d;
    } catch (e) {
      setErreur(messageErreur(e, 'Enregistrement impossible.'));
      setEtat('pret');
      return null;
    }
  }, [document, id, valeurs, titre, structure]);

  // Enregistrement automatique du brouillon
  useEffect(() => {
    if (!modifie || !document?.modifiable) return undefined;
    minuteur.current = setTimeout(() => {
      enregistrer();
    }, DELAI_SAUVEGARDE);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [modifie, valeurs, titre, structure, document, enregistrer]);

  const changer = (cle: string, v: any) => {
    setValeurs((avant) => ({ ...avant, [cle]: v }));
    setModifie(true);
  };

  const changerTitre = (t: string) => {
    setTitre(t);
    setModifie(true);
  };

  const changerStructureLibre = (s: Structure) => {
    setStructure(s);
    setModifie(true);
  };

  const manquants = structure ? champsManquants(structure, valeurs) : [];

  const valider = async (): Promise<boolean> => {
    if (manquants.length > 0) {
      setErreur(`Champs obligatoires à remplir : ${manquants.join(', ')}.`);
      return false;
    }
    const enregistre = await enregistrer();
    if (!enregistre) return false;
    try {
      appliquer(await validerDocument(id));
      setEtat('pret');
      setErreur('');
      return true;
    } catch (e) {
      setErreur(messageErreur(e, 'Validation impossible.'));
      return false;
    }
  };

  const supprimer = async (): Promise<boolean> => {
    try {
      await supprimerBrouillon(id);
      return true;
    } catch (e) {
      setErreur(messageErreur(e, 'Suppression impossible.'));
      return false;
    }
  };

  const rectifier = async (): Promise<string | null> => {
    try {
      return (await rectifierDocument(id)).resume.id;
    } catch (e) {
      setErreur(messageErreur(e, 'Rectification impossible.'));
      return null;
    }
  };

  const pdf = async () => {
    if (modifie) await enregistrer();
    try {
      await pdfMedecin(id);
    } catch (e) {
      setErreur(messageErreur(e, 'PDF indisponible.'));
    }
  };

  const proposer = async (intitule: string, details: string): Promise<boolean> => {
    try {
      await proposerCommeModele(id, intitule, details);
      return true;
    } catch (e) {
      setErreur(messageErreur(e, 'Proposition impossible.'));
      return false;
    }
  };

  return {
    document,
    valeurs,
    structure,
    titre,
    references,
    etat,
    erreur,
    modifie,
    manquants,
    changer,
    changerTitre,
    changerStructureLibre,
    enregistrer,
    valider,
    supprimer,
    rectifier,
    pdf,
    proposer,
  };
}
