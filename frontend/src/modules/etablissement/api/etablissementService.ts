import api from '@/shared/api/api';

export type FormeLogo = 'RONDE' | 'CARREE' | 'RECTANGLE';

export type Identite = {
  configure: boolean;
  nom: string;
  forme: FormeLogo;
  logoParDefaut: boolean;
  version: number;
};

/** Adresse du logo ; la version force le rafraîchissement après un changement. */
export const urlLogo = (version: number) => `/api/etablissement/logo?v=${version}`;

export const lireIdentite = async (): Promise<Identite> => (await api.get<Identite>('/api/etablissement')).data;

export const configurerIdentite = async (
  nom: string,
  forme: FormeLogo,
  logo: Blob | null,
  parDefaut: boolean,
): Promise<Identite> => {
  const donnees = new FormData();
  donnees.append('nom', nom);
  donnees.append('forme', forme);
  donnees.append('parDefaut', String(parDefaut));
  if (logo) donnees.append('logo', logo, 'logo.png');
  const { data } = await api.put<Identite>('/api/admin/etablissement', donnees, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
