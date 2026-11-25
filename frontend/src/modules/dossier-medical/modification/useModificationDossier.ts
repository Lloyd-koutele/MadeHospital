import { useMemo, useState, type FormEvent } from 'react';
import { updateDossierMedical } from '@/modules/medecin/api/medecinService';
import { calculerImc, type Sexe } from '@/modules/patient/creation/regles';

export type DossierEditable = {
  sexe?: string | null;
  groupeSanguin?: string | null;
  poids?: string | null;
  taille?: string | null;
  contexte?: string | null;
  allergies?: string | null;
  traitements?: string | null;
};

type Valeurs = {
  sexe: Sexe;
  groupeSanguin: string;
  poids: string;
  taille: string;
  contexte: string;
};

const sexeValide = (s?: string | null): Sexe => (s === 'M' ? 'M' : 'F');

/**
 * Logique de modification du dossier médical (sexe, constantes, groupe sanguin, antécédents).
 * Le serveur vérifie que le médecin a accès au patient. Aucun style ici.
 */
export function useModificationDossier(patientId: number, dossier: DossierEditable | null | undefined, onSucces: (message: string) => void) {
  const [valeurs, setValeurs] = useState<Valeurs>({
    sexe: sexeValide(dossier?.sexe),
    groupeSanguin: dossier?.groupeSanguin ?? '',
    poids: dossier?.poids ?? '',
    taille: dossier?.taille ?? '',
    contexte: dossier?.contexte ?? '',
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const changer = <K extends keyof Valeurs>(champ: K, valeur: Valeurs[K]) => setValeurs((v) => ({ ...v, [champ]: valeur }));
  const imc = useMemo(() => calculerImc(valeurs.taille, valeurs.poids), [valeurs.taille, valeurs.poids]);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    const poids = parseFloat(valeurs.poids);
    const taille = parseFloat(valeurs.taille);
    if (valeurs.poids && (Number.isNaN(poids) || poids <= 0 || poids > 350)) {
      setErreur('Le poids doit être compris entre 0 et 350 kg.');
      return;
    }
    if (valeurs.taille && (Number.isNaN(taille) || taille < 30 || taille > 250)) {
      setErreur('La taille doit être comprise entre 30 et 250 cm.');
      return;
    }
    setErreur('');
    setEnvoi(true);
    try {
      await updateDossierMedical(patientId, {
        sexe: valeurs.sexe,
        groupeSanguin: valeurs.groupeSanguin || null,
        poids: valeurs.poids || null,
        taille: valeurs.taille || null,
        contexte: valeurs.contexte.trim() || null,
        // la mise à jour remplace tout le dossier : on renvoie les champs non modifiés ici
        allergies: dossier?.allergies ?? null,
        traitements: dossier?.traitements ?? null,
      });
      onSucces('Dossier médical mis à jour.');
    } catch (err: any) {
      const donnees = err?.response?.data;
      setErreur((typeof donnees === 'string' && donnees) || donnees?.message || "Le dossier n'a pas pu être mis à jour.");
    } finally {
      setEnvoi(false);
    }
  };

  return { valeurs, changer, imc, erreur, envoi, soumettre };
}
