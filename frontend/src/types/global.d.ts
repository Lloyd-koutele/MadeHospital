// Propriétés globales posées sur window par l'application (héritées de la version JavaScript).
export {};

declare global {
  interface Window {
    dossierMedicalLayout?: any;
    imageMedicaleProps?: Record<string, any>;
    dicomErrorsLogged?: Record<string, boolean>;
  }
}
