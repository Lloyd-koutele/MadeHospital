import { FaHospitalAlt } from 'react-icons/fa';
import { useServicesMedecin } from '../serviceActif';
import './services.css';

/**
 * Choix du service actif du médecin, affiché dans la barre de navigation.
 * Un seul service : simple badge. Plusieurs : liste déroulante. Aucun : avertissement.
 */
function SelecteurService() {
  const { servicesActifs, serviceActifId, choisirService, chargement } = useServicesMedecin();

  if (chargement) return null;

  if (servicesActifs.length === 0) {
    return (
      <span className="selecteur-service selecteur-service-vide" title="Contactez l'administrateur">
        <FaHospitalAlt aria-hidden="true" /> Aucun service
      </span>
    );
  }

  if (servicesActifs.length === 1) {
    return (
      <span className="selecteur-service">
        <FaHospitalAlt aria-hidden="true" /> {servicesActifs[0].nom}
      </span>
    );
  }

  return (
    <label className="selecteur-service">
      <FaHospitalAlt aria-hidden="true" />
      <span className="visually-hidden">Service actif</span>
      <select value={serviceActifId ?? ''} onChange={(e) => choisirService(Number(e.target.value))}>
        {servicesActifs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SelecteurService;
