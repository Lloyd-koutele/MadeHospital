import type { FormeLogo } from '../api/etablissementService';

/** Règles du recadrage du symbole (sans affichage). */

export const TAILLE_MAX_OCTETS = 2 * 1024 * 1024;
export const TYPES_ACCEPTES = ['image/png', 'image/jpeg', 'image/webp'];

/** Cadre affiché (px) selon la forme. */
export const cadre = (forme: FormeLogo) => (forme === 'RECTANGLE' ? { l: 300, h: 200 } : { l: 260, h: 260 });

/** Image exportée (px) selon la forme. */
export const sortie = (forme: FormeLogo) => (forme === 'RECTANGLE' ? { l: 768, h: 512 } : { l: 512, h: 512 });

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 4;

export type Position = { x: number; y: number };

/** Échelle de base : l'image couvre juste le cadre. */
export const echelleBase = (img: { l: number; h: number }, c: { l: number; h: number }) =>
  Math.max(c.l / img.l, c.h / img.h);

/** Empêche de faire sortir l'image du cadre (ou, plus petite que le cadre, de la décentrer hors du cadre). */
export const borner = (p: Position, img: { l: number; h: number }, c: { l: number; h: number }, echelle: number): Position => {
  const mx = Math.abs(img.l * echelle - c.l) / 2;
  const my = Math.abs(img.h * echelle - c.h) / 2;
  return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
};

export const verifierFichier = (fichier: File): string | null => {
  if (!TYPES_ACCEPTES.includes(fichier.type)) return 'Choisissez une image PNG, JPEG ou WebP.';
  if (fichier.size > TAILLE_MAX_OCTETS * 5) return "L'image est trop lourde (10 Mo au maximum avant recadrage).";
  return null;
};

/** Dessine le recadrage dans un PNG (fond transparent, découpe ronde si besoin). */
export const exporter = (
  image: HTMLImageElement,
  forme: FormeLogo,
  position: Position,
  echelle: number,
): Promise<Blob> => {
  const c = cadre(forme);
  const s = sortie(forme);
  const ratio = s.l / c.l;
  const canvas = document.createElement('canvas');
  canvas.width = s.l;
  canvas.height = s.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas indisponible'));
  if (forme === 'RONDE') {
    ctx.beginPath();
    ctx.arc(s.l / 2, s.h / 2, s.l / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  const l = image.naturalWidth * echelle * ratio;
  const h = image.naturalHeight * echelle * ratio;
  const x = (c.l / 2 + position.x) * ratio - l / 2;
  const y = (c.h / 2 + position.y) * ratio - h / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, x, y, l, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export impossible'))), 'image/png'),
  );
};

export const LIBELLES_FORMES: Record<FormeLogo, string> = {
  RONDE: 'Rond',
  CARREE: 'Carré',
  RECTANGLE: 'Rectangle',
};
