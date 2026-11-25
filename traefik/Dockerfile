# Traefik "maison" de MadeHospital : image officielle Traefik + configuration de routage intégrée.
# Au démarrage, docker-entrypoint.sh génère dynamic.yml à partir du gabarit en y injectant APP_DOMAIN,
# qui reste ainsi la seule source du nom de domaine (aussi utilisé par le backend pour CORS).
FROM traefik:v3.2

COPY docker-entrypoint.sh /docker-entrypoint-madehospital.sh
COPY dynamic.yml.template /etc/traefik/dynamic-template/dynamic.yml.template
RUN chmod +x /docker-entrypoint-madehospital.sh

ENTRYPOINT ["/docker-entrypoint-madehospital.sh"]
CMD ["traefik"]
