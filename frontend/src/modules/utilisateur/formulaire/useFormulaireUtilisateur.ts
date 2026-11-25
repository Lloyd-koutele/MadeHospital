import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createAdmin, createChercheur, createMedecin, getUserDetail, updateUser } from '../api/adminService';
import { listerServices, type ServiceHospitalier } from '@/modules/service-hospitalier/api/serviceHospitalierService';
import {
  evaluerMotDePasse,
  formaterTelephone,
  telephoneComplet,
  analyserTelephone,
  telephoneValide,
  LONGUEUR_MIN_MOT_DE_PASSE,
  type RoleCompte,
} from './regles';

export type ValeursFormulaire = {
  role: RoleCompte;
  nom: string;
  prenom: string;
  email: string;
  paysTelephone: string; // code pays ISO (SN par défaut)
  telephone: string; // numéro national, sans indicatif
  password: string;
  departement: string;
  specialiteRecherche: string;
  specialite: string;
  numeroOrdre: string;
  serviceIds: number[];
};

const VIDE: ValeursFormulaire = {
  role: 'MEDECIN',
  nom: '',
  prenom: '',
  email: '',
  paysTelephone: 'SN',
  telephone: '',
  password: '',
  departement: '',
  specialiteRecherche: '',
  specialite: '',
  numeroOrdre: '',
  serviceIds: [],
};

type Options = {
  /** Identifiant de l'utilisateur à modifier ; absent pour une création. */
  userId?: number | null;
  onSucces: (message: string) => void;
};

/**
 * Logique du formulaire de création / modification d'un utilisateur :
 * état, chargement de la fiche, validation, envoi au serveur. Aucun style ici.
 */
export function useFormulaireUtilisateur({ userId, onSucces }: Options) {
  const modification = userId != null;
  const [valeurs, setValeurs] = useState<ValeursFormulaire>(VIDE);
  const [services, setServices] = useState<ServiceHospitalier[]>([]);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(modification);
  const [envoi, setEnvoi] = useState(false);

  // Services disponibles (pour rattacher un médecin)
  useEffect(() => {
    listerServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  // Fiche existante en modification
  useEffect(() => {
    if (!modification) {
      setValeurs(VIDE);
      setChargement(false);
      return;
    }
    setChargement(true);
    getUserDetail(userId)
      .then((fiche) =>
        setValeurs({
          ...VIDE,
          role: fiche.roles,
          nom: fiche.nom ?? '',
          prenom: fiche.prenom ?? '',
          email: fiche.email ?? '',
          paysTelephone: analyserTelephone(fiche.telephone).pays,
          telephone: analyserTelephone(fiche.telephone).local,
          departement: fiche.departement ?? '',
          specialiteRecherche: fiche.specialiteRecherche ?? '',
          specialite: fiche.specialite ?? '',
          numeroOrdre: fiche.numeroOrdre ?? '',
          serviceIds: fiche.serviceIds ?? [],
        }),
      )
      .catch(() => setErreur("Impossible de charger la fiche de l'utilisateur."))
      .finally(() => setChargement(false));
  }, [modification, userId]);

  const changer = <K extends keyof ValeursFormulaire>(champ: K, valeur: ValeursFormulaire[K]) =>
    setValeurs((v) => ({ ...v, [champ]: valeur }));

  const actions = {
    choisirRole: (role: RoleCompte) => !modification && changer('role', role),
    changer,
    changerTelephone: (saisie: string) => changer('telephone', formaterTelephone(saisie, valeurs.paysTelephone)),
    changerPaysTelephone: (pays: string) =>
      setValeurs((v) => ({ ...v, paysTelephone: pays, telephone: formaterTelephone(v.telephone, pays) })),
    basculerService: (id: number) =>
      setValeurs((v) => ({
        ...v,
        serviceIds: v.serviceIds.includes(id) ? v.serviceIds.filter((s) => s !== id) : [...v.serviceIds, id],
      })),
    basculerVisibilite: () => setMotDePasseVisible((v) => !v),
  };

  const robustesse = useMemo(() => evaluerMotDePasse(valeurs.password), [valeurs.password]);
  const servicesActifs = services.filter((s) => s.actif || valeurs.serviceIds.includes(s.id));

  const valider = (): string | null => {
    const v = valeurs;
    if (!v.nom.trim() || !v.prenom.trim()) return 'Le nom et le prénom sont obligatoires.';
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return "L'adresse email n'est pas valide.";
    if (!telephoneValide(v.telephone, v.paysTelephone)) return "Le numéro de téléphone est incomplet pour le pays choisi.";
    if (!modification && v.password.length < LONGUEUR_MIN_MOT_DE_PASSE)
      return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
    if (modification && v.password && v.password.length < LONGUEUR_MIN_MOT_DE_PASSE)
      return `Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
    if (v.role === 'ADMIN' && !v.departement.trim()) return 'Le département est obligatoire.';
    if (v.role === 'CHERCHEUR' && !v.specialiteRecherche.trim()) return 'Le domaine de recherche est obligatoire.';
    if (v.role === 'MEDECIN' && (!v.specialite.trim() || !v.numeroOrdre.trim()))
      return "La spécialité et le numéro d'ordre sont obligatoires.";
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
    const commun = {
      nom: v.nom.trim(),
      prenom: v.prenom.trim(),
      email: v.email.trim(),
      telephone: telephoneComplet(v.telephone, v.paysTelephone),
    };
    try {
      if (modification) {
        await updateUser(userId, {
          ...commun,
          password: v.password || undefined,
          departement: v.departement,
          specialiteRecherche: v.specialiteRecherche,
          specialite: v.specialite,
          numeroOrdre: v.numeroOrdre,
          serviceIds: v.role === 'MEDECIN' ? v.serviceIds : undefined,
        });
        onSucces(`Le compte de ${commun.prenom} ${commun.nom} a été mis à jour.`);
      } else {
        const avecMotDePasse = { ...commun, password: v.password };
        if (v.role === 'MEDECIN') {
          await createMedecin({ ...avecMotDePasse, specialite: v.specialite, numeroOrdre: v.numeroOrdre, serviceIds: v.serviceIds });
        } else if (v.role === 'CHERCHEUR') {
          await createChercheur({ ...avecMotDePasse, specialiteRecherche: v.specialiteRecherche });
        } else {
          await createAdmin({ ...avecMotDePasse, departement: v.departement });
        }
        onSucces(`Le compte de ${commun.prenom} ${commun.nom} a été créé.`);
      }
    } catch (err: any) {
      setErreur(err?.response?.data?.message || err?.message || "L'enregistrement a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  return {
    modification,
    valeurs,
    servicesActifs,
    motDePasseVisible,
    robustesse,
    erreur,
    chargement,
    envoi,
    actions,
    soumettre,
  };
}
