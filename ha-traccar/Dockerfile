FROM traccar/traccar:alpine

RUN apk add --no-cache bash jq gettext

# Annulla ENTRYPOINT
ENTRYPOINT []

COPY run.sh /run.sh
COPY traccar.template.xml /opt/traccar/conf/traccar.template.xml

RUN chmod +x /run.sh

CMD ["/bin/bash", "/run.sh"]
