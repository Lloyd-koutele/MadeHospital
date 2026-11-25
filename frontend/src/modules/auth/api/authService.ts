import api from '@/shared/api/api';

/**
 * Authentification côté client.
 * Le rôle n'est jamais choisi par l'utilisateur : il est renvoyé par le serveur à la connexion
 * (lu dans le compte) et ne sert ici qu'à l'affichage et à la navigation. Chaque appel à l'API
 * est de toute façon revérifié côté serveur.
 */

export type Role = 'ADMIN' | 'MEDECIN' | 'PATIENT' | 'CHERCHEUR';

export type UserInfo = {
  email: string;
  role: Role;
};

type JwtPayload = {
  sub?: string;
  role?: Role;
  exp?: number;
};

const CLES_STOCKAGE = ['token', 'userRole', 'userInfo', 'user', 'userId', 'permissions', 'patientId', 'medecinId'];

function lireJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const brut = token.startsWith('Bearer ') ? token.slice(7) : token;
    const base64 = brut.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Page d'accueil de chaque rôle après connexion. */
export const espaceDuRole = (role: Role | null): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'MEDECIN':
      return '/medecin';
    case 'CHERCHEUR':
      return '/chercheur';
    case 'PATIENT':
      return '/patient';
    default:
      return '/';
  }
};

/**
 * Connexion par email et mot de passe. Renvoie le rôle du compte.
 * En cas d'échec, lève une erreur dont le message est prêt à être affiché.
 */
export const loginUser = async (email: string, password: string): Promise<Role> => {
  try {
    const response = await api.post('/api/login', { email, password });
    const { token, role } = response.data as { token?: string; role?: Role };
    if (!token || !role) {
      throw new Error('Réponse du serveur incomplète.');
    }
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userInfo', JSON.stringify({ email, role } satisfies UserInfo));
    return role;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      (error?.response ? 'Email ou mot de passe invalide.' : 'Serveur injoignable. Réessayez dans un instant.');
    throw new Error(message);
  }
};

export const logout = async () => {
  try {
    await api.post('/api/logout');
  } catch {
    // La déconnexion locale suffit si le serveur ne répond pas
  } finally {
    CLES_STOCKAGE.forEach((cle) => localStorage.removeItem(cle));
  }
  return true;
};

export const isAuthenticated = (): boolean => {
  const payload = lireJwt(localStorage.getItem('token'));
  if (!payload) return false;
  return payload.exp ? payload.exp * 1000 > Date.now() : true;
};

export const getCurrentUserRole = (): Role | null => {
  const stocke = localStorage.getItem('userRole') as Role | null;
  if (stocke) return stocke;
  return lireJwt(localStorage.getItem('token'))?.role ?? null;
};

// Alias conservé pour le code existant
export const getUserRole = getCurrentUserRole;

export const getCurrentUserInfo = (): UserInfo | null => {
  const stocke = localStorage.getItem('userInfo');
  if (stocke) {
    try {
      return JSON.parse(stocke) as UserInfo;
    } catch {
      // on retombe sur le jeton
    }
  }
  const payload = lireJwt(localStorage.getItem('token'));
  if (!payload?.sub || !payload.role) return null;
  return { email: payload.sub, role: payload.role };
};
