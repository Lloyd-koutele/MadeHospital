import { useCallback, useEffect, useRef, useState } from 'react';
import { configurerIdentite, type FormeLogo, type Identite } from '../api/etablissementService';
import { identiteFraiche, signalerChangementIdentite } from '../useEtablissement';
import { borner, cadre, echelleBase, exporter, verifierFichier, ZOOM_MAX, ZOOM_MIN, type Position } from './recadrage';

/** État de l'assistant : nom, image choisie, forme, zoom et position du recadrage, enregistrement. */
export function useAssistantIdentite() {
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [nom, setNom] = useState('');
  const [forme, setForme] = useState<FormeLogo>('RONDE');
  const [source, setSource] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoomBrut] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [apercu, setApercu] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const urlCourante = useRef<string | null>(null);

  useEffect(() => {
    identiteFraiche().then((i) => {
      setIdentite(i);
      setNom(i.configure ? i.nom : '');
      setForme(i.forme);
    });
    return () => {
      if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
    };
  }, []);

  const dimensions = image ? { l: image.naturalWidth, h: image.naturalHeight } : null;
  const echelle = dimensions ? echelleBase(dimensions, cadre(forme)) * zoom : 1;

  const choisirFichier = (fichier: File | undefined) => {
    if (!fichier) return;
    const probleme = verifierFichier(fichier);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setErreur('');
    if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
    const url = URL.createObjectURL(fichier);
    urlCourante.current = url;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setSource(url);
      setZoomBrut(1);
      setPosition({ x: 0, y: 0 });
    };
    img.onerror = () => setErreur("Cette image ne peut pas être lue.");
    img.src = url;
  };

  const setZoom = (valeur: number) => {
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, valeur));
    setZoomBrut(z);
    if (dimensions) setPosition((p) => borner(p, dimensions, cadre(forme), echelleBase(dimensions, cadre(forme)) * z));
  };

  const deplacer = (dx: number, dy: number) => {
    if (!dimensions) return;
    setPosition((p) => borner({ x: p.x + dx, y: p.y + dy }, dimensions, cadre(forme), echelle));
  };

  const changerForme = (f: FormeLogo) => {
    setForme(f);
    if (dimensions) setPosition((p) => borner(p, dimensions, cadre(f), echelleBase(dimensions, cadre(f)) * zoom));
  };

  // Aperçu du résultat (barre de navigation, en-tête de document)
  useEffect(() => {
    if (!image) {
      setApercu(null);
      return undefined;
    }
    let actif = true;
    let url: string | null = null;
    const minuteur = setTimeout(() => {
      exporter(image, forme, position, echelle)
        .then((blob) => {
          if (!actif) return;
          url = URL.createObjectURL(blob);
          setApercu(url);
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      actif = false;
      clearTimeout(minuteur);
      if (url) URL.revokeObjectURL(url);
    };
  }, [image, forme, position, echelle]);

  const enregistrer = useCallback(
    async (parDefaut: boolean): Promise<boolean> => {
      if (!nom.trim()) {
        setErreur("Indiquez le nom de l'hôpital.");
        return false;
      }
      if (!parDefaut && !image && !identite?.configure) {
        setErreur('Choisissez une image, ou utilisez le symbole par défaut.');
        return false;
      }
      setEnregistrement(true);
      setErreur('');
      try {
        const blob = !parDefaut && image ? await exporter(image, forme, position, echelle) : null;
        const resultat = await configurerIdentite(nom.trim(), forme, blob, parDefaut);
        signalerChangementIdentite(resultat);
        setIdentite(resultat);
        return true;
      } catch (e: any) {
        setErreur(e?.response?.data?.message || "Enregistrement impossible. Réessayez.");
        return false;
      } finally {
        setEnregistrement(false);
      }
    },
    [nom, image, forme, position, echelle, identite],
  );

  return {
    identite,
    nom,
    setNom,
    forme,
    changerForme,
    source,
    image,
    zoom,
    setZoom,
    position,
    echelle,
    deplacer,
    choisirFichier,
    apercu,
    erreur,
    enregistrement,
    enregistrer,
  };
}
