import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaCrown, FaEdit, FaPlus, FaPowerOff, FaUserMd } from 'react-icons/fa';
import Modal from '@/shared/ui/Modal';
import { getUsersByRole } from '@/modules/utilisateur/api/adminService';
import {
  affecterMedecins,
  designerChef,
  changerStatutService,
  creerService,
  listerServices,
  messageErreur,
  modifierService,
  type ServiceHospitalier,
  type ServiceRequete,
} from '../api/serviceHospitalierService';
import './services.css';

type Medecin = { id: number; nom: string; prenom: string; email: string; specialite?: string };

const VIDE: ServiceRequete = { nom: '', description: '' };

/**
 * Administration des services de l'hôpital : création, modification, activation
 * et affectation des médecins.
 */
function ServicesPanel() {
  const [services, setServices] = useState<ServiceHospitalier[]>([]);
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Formulaire de création / modification
  const [edition, setEdition] = useState<ServiceHospitalier | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState<ServiceRequete>(VIDE);
  const [erreurForm, setErreurForm] = useState('');

  // Affectation des médecins
  const [affectation, setAffectation] = useState<ServiceHospitalier | null>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [recherche, setRecherche] = useState('');

  const charger = async () => {
    setChargement(true);
    setErreur('');
    try {
      const [liste, docteurs] = await Promise.all([listerServices(), getUsersByRole('MEDECIN')]);
      setServices(liste);
      setMedecins(Array.isArray(docteurs) ? docteurs : []);
    } catch (e) {
      setErreur(messageErreur(e, 'Impossible de charger les services.'));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const medecinsParId = useMemo(() => new Map(medecins.map((m) => [m.id, m])), [medecins]);

  const ouvrirCreation = () => {
    setEdition(null);
    setForm(VIDE);
    setErreurForm('');
    setFormOuvert(true);
  };

  const ouvrirModification = (service: ServiceHospitalier) => {
    setEdition(service);
    setForm({ nom: service.nom, description: service.description ?? '' });
    setErreurForm('');
    setFormOuvert(true);
  };

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (edition) {
        await modifierService(edition.id, form);
      } else {
        await creerService(form);
      }
      setFormOuvert(false);
      await charger();
    } catch (err) {
      setErreurForm(messageErreur(err, "Enregistrement impossible."));
    }
  };

  const basculerStatut = async (service: ServiceHospitalier) => {
    try {
      await changerStatutService(service.id, !service.actif);
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, 'Changement de statut impossible.'));
    }
  };

  const changerChef = async (service: ServiceHospitalier, valeur: string) => {
    try {
      const misAJour = await designerChef(service.id, valeur ? Number(valeur) : null);
      setServices((liste) => liste.map((s) => (s.id === misAJour.id ? misAJour : s)));
    } catch (err) {
      setErreur(messageErreur(err, 'Désignation du chef impossible.'));
    }
  };

  const ouvrirAffectation = (service: ServiceHospitalier) => {
    setAffectation(service);
    setSelection(new Set(service.medecinIds ?? []));
    setRecherche('');
  };

  const basculerMedecin = (id: number) => {
    const suivante = new Set(selection);
    if (suivante.has(id)) {
      suivante.delete(id);
    } else {
      suivante.add(id);
    }
    setSelection(suivante);
  };

  const enregistrerAffectation = async () => {
    if (!affectation) return;
    try {
      await affecterMedecins(affectation.id, [...selection]);
      setAffectation(null);
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, 'Affectation impossible.'));
    }
  };

  const medecinsFiltres = medecins.filter((m) =>
    `${m.nom} ${m.prenom} ${m.email} ${m.specialite ?? ''}`.toLowerCase().includes(recherche.toLowerCase()),
  );

  return (
    <section className="services-panel">
      <div className="services-entete">
        <p className="services-resume">
          <strong>{services.length}</strong> service(s) · <strong>{services.filter((x) => x.actif).length}</strong> actif(s)
        </p>
        <button type="button" className="services-bouton" onClick={ouvrirCreation}>
          <FaPlus aria-hidden="true" /> Nouveau service
        </button>
      </div>

      {erreur && <div className="services-erreur" role="alert">{erreur}</div>}

      {chargement ? (
        <p className="services-info">Chargement…</p>
      ) : services.length === 0 ? (
        <div className="services-vide">
          <p>Aucun service pour l'instant.</p>
          <p>Créez par exemple « Imagerie » ou « Odontologie », puis affectez-y des médecins.</p>
        </div>
      ) : (
        <div className="services-grille">
          {services.map((service) => {
            const docteurs = (service.medecinIds ?? []).map((id) => medecinsParId.get(id)).filter(Boolean) as Medecin[];
            return (
              <article key={service.id} className={`service-carte${service.actif ? '' : ' service-carte-inactive'}`}>
                <header>
                  <span className="service-code">{service.code}</span>
                  <h3>{service.nom}</h3>
                  <span className={`service-statut ${service.actif ? 'actif' : 'inactif'}`}>
                    {service.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </header>
                {service.description && <p className="service-description">{service.description}</p>}
                <div className="service-medecins">
                  <FaUserMd aria-hidden="true" />
                  {docteurs.length === 0
                    ? 'Aucun médecin affecté'
                    : docteurs.map((d) => `Dr ${d.prenom} ${d.nom}`).join(', ')}
                </div>
                <label className="service-chef">
                  <FaCrown aria-hidden="true" />
                  <span>Chef de service</span>
                  <select
                    value={service.chefId ?? ''}
                    onChange={(e) => changerChef(service, e.target.value)}
                    disabled={docteurs.length === 0}
                  >
                    <option value="">{docteurs.length === 0 ? 'Affectez d\'abord des médecins' : 'Aucun chef'}</option>
                    {docteurs.map((d) => (
                      <option key={d.id} value={d.id}>Dr {d.prenom} {d.nom}</option>
                    ))}
                  </select>
                </label>
                <footer>
                  <button type="button" onClick={() => ouvrirAffectation(service)}>
                    <FaUserMd aria-hidden="true" /> Médecins ({docteurs.length})
                  </button>
                  <button type="button" onClick={() => ouvrirModification(service)}>
                    <FaEdit aria-hidden="true" /> Modifier
                  </button>
                  <button type="button" onClick={() => basculerStatut(service)}>
                    <FaPowerOff aria-hidden="true" /> {service.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <Modal isOpen={formOuvert} onClose={() => setFormOuvert(false)} title={edition ? 'Modifier le service' : 'Nouveau service'}>
        <form className="services-form" onSubmit={enregistrer}>
          {erreurForm && <div className="services-erreur" role="alert">{erreurForm}</div>}
          <label>
            Nom
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex. Imagerie médicale"
              required
            />
          </label>
          <p className="services-info">
            {edition
              ? `Code du service : ${edition.code} (attribué à la création, il ne change pas).`
              : 'Le code court du service (ex. IMA, MI) est attribué automatiquement à partir du nom.'}
          </p>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Facultatif"
            />
          </label>
          <div className="services-form-actions">
            <button type="button" className="services-bouton-secondaire" onClick={() => setFormOuvert(false)}>
              Annuler
            </button>
            <button type="submit" className="services-bouton">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={affectation !== null}
        onClose={() => setAffectation(null)}
        title={affectation ? `Médecins du service ${affectation.nom}` : ''}
      >
        <div className="services-form">
          <input
            className="services-recherche"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un médecin…"
          />
          {medecins.length === 0 ? (
            <p className="services-info">Aucun médecin enregistré. Créez d'abord des comptes médecins.</p>
          ) : (
            <ul className="services-liste-medecins">
              {medecinsFiltres.map((m) => (
                <li key={m.id}>
                  <label>
                    <input type="checkbox" checked={selection.has(m.id)} onChange={() => basculerMedecin(m.id)} />
                    <span>
                      Dr {m.prenom} {m.nom}
                      <small>{m.specialite ? `${m.specialite} · ` : ''}{m.email}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="services-form-actions">
            <span className="services-info">{selection.size} médecin(s) sélectionné(s)</span>
            <button type="button" className="services-bouton" onClick={enregistrerAffectation}>
              Enregistrer l'affectation
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default ServicesPanel;
