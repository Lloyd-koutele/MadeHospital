import './services.css';

type Props = {
  service?: { nom?: string; code?: string } | null;
};

/** Badge du service d'une consultation ou d'un rendez-vous. */
function BadgeService({ service }: Props) {
  if (!service?.nom) {
    return <span className="badge-service badge-service-vide">Sans service</span>;
  }
  return (
    <span className="badge-service" title={service.nom}>
      {service.code ? <strong>{service.code}</strong> : null} {service.nom}
    </span>
  );
}

export default BadgeService;
