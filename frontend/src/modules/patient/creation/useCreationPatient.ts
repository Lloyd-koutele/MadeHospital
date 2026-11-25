import { useMemo, useState, type FormEvent } from 'react';
import api from '@/shared/api/api';
import { formaterTelephone, telephoneComplet, telephoneValide } from '@/shared/utils/telephone';
import { ageDepuis, calculerImc, dateDansLePasse, LONGUEUR_MIN_MOT_DE_PASSE, type Sexe } from './regles';

export type ValeursPatient = {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: Sexe;
  paysTelephone: string; // code pays ISO (SN par défaut)
  telephone: string; // numéro national, sans indicatif
  email: string;
  taille: string;
  poids: string;
  groupeSanguin: string;
  contexte: string;
  password: string;
};

const VIDE: ValeursPatient = {
  nom: '',
  prenom: '',
  dateNaissance: '',
  sexe: 'F',
  paysTelephone: 'SN',
  telephone: '',
  email: '',
  taille: '',
  poids: '',
  groupeSanguin: '',
  contexte: '',
  password: '',
};

/** Message lisible depuis une erreur du serveur (texte brut ou objet { message }). */
const messageServeur = (err: any): string => {
  const donnees = err?.response?.data;
  if (typeof donnees === 'string' && donnees.trim()) return donnees;
  return donnees?.message || err?.message || "Le dossier patient n'a pas pu être créé.";
};

/**
 * Logique du formulaire de création d'un dossier patient : état, calculs (âge, IMC), validation, envoi.
 * Le médecin connecté devient automatiquement le médecin référent (côté serveur). Aucun style ici.
 */
export function useCreationPatient(onSucces: (message: string) => void) {
  const [valeurs, setValeurs] = useState<ValeursPatient>(VIDE);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const changer = <K extends keyof ValeursPatient>(champ: K, valeur: ValeursPatient[K]) =>
    setValeurs((v) => ({ ...v, [champ]: valeur }));

  const age = useMemo(() => ageDepuis(valeurs.dateNaissance), [valeurs.dateNaissance]);
  const imc = useMemo(() => calculerImc(valeurs.taille, valeurs.poids), [valeurs.taille, valeurs.poids]);

  const valider = (): string | null => {
    const v = valeurs;
    if (!v.nom.trim() || !v.prenom.trim()) return 'Le nom et le prénom sont obligatoires.';
    if (!v.dateNaissance || !dateDansLePasse(v.dateNaissance)) return 'La date de naissance doit être dans le passé.';
    if (!telephoneValide(v.telephone, v.paysTelephone)) return 'Le numéro de téléphone est incomplet pour le pays choisi.';
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return "L'adresse email n'est pas valide.";
    if (v.password.length < LONGUEUR_MIN_MOT_DE_PASSE)
      return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
    return null;
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    const probleme = valider();
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setErreur('');
    setEnvoi(true);
    const v = valeurs;
    try {
      await api.post('/api/medecin/create-patient', {
        nom: v.nom.trim(),
        prenom: v.prenom.trim(),
        dateNaissance: v.dateNaissance,
        sexe: v.sexe,
        telephone: telephoneComplet(v.telephone, v.paysTelephone),
        email: v.email.trim().toLowerCase(),
        taille: v.taille || null,
        poids: v.poids || null,
        groupeSanguin: v.groupeSanguin || null,
        contexte: v.contexte.trim() || null,
        password: v.password,
      });
      setValeurs(VIDE);
      onSucces(`Dossier créé pour ${v.prenom.trim()} ${v.nom.trim()}.`);
    } catch (err) {
      setErreur(messageServeur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return {
    valeurs,
    changer,
    changerTelephone: (saisie: string) => changer('telephone', formaterTelephone(saisie, valeurs.paysTelephone)),
    changerPaysTelephone: (pays: string) =>
      setValeurs((v) => ({ ...v, paysTelephone: pays, telephone: formaterTelephone(v.telephone, pays) })),
    age,
    imc,
    motDePasseVisible,
    basculerVisibilite: () => setMotDePasseVisible((m) => !m),
    erreur,
    envoi,
    soumettre,
  };
}
