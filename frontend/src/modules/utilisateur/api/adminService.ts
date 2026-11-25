import api from '@/shared/api/api';


export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/admin/create-user', userData);
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

export const createMedecin = async (medecinData) => {
  try {
    const response = await api.post('/api/admin/medecins', medecinData);
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

export const createChercheur = async (chercheurData) => {
  try {
    const response = await api.post('/api/admin/chercheurs', chercheurData);
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

export const createAdmin = async (adminData) => {
  try {
    const response = await api.post('/api/admin/admins', adminData);
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }          
};

export const getAllUsers = async () => {
  try {
    const response = await api.get('/api/admin/users');
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};


export const updateUserStatus = async (userId, status) => {
  try {
    if (!userId) {
      throw new Error('ID utilisateur manquant');
    }
    
    const response = await api.put('/api/admin/users/status', { 
      userId: userId, 
      actif: status 
    });
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

export const getUsersByRole = async (role) => {
  try {
    const response = await api.get(`/api/admin/${role.toLowerCase()}s`);
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

export const getInactiveUsers = async () => {
  try {
    const response = await api.get('/api/admin/users?actif=false');
    return response.data;
  } catch (error) {
    console.error('Détails de l\'erreur:', error.response?.data || error);
    throw error.response?.data?.message 
      ? new Error(error.response.data.message)
      : error;
  }
};

/** Fiche détaillée d'un utilisateur (champs propres au rôle, services d'un médecin). */
export const getUserDetail = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}`);
  return response.data;
};

/** Modification d'un utilisateur par un administrateur (le rôle ne change pas). */
export const updateUser = async (userId, donnees) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}`, donnees);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message ? new Error(error.response.data.message) : error;
  }
};
