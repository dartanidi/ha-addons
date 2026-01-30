FROM traccar/traccar:alpine

RUN apk add --no-cache bash jq gettext

WORKDIR /opt/traccar

COPY run.sh /run.sh
COPY traccar.template.xml /opt/traccar/conf/traccar.template.xml

RUN chmod +x /run.sh

CMD ["/run.sh"]
