FROM node:20-alpine

# Installa build tools e librerie per sharp
RUN apk add --no-cache jq build-base vips-dev

# Accetta l'argomento di build da HA
ARG BUILD_VERSION
# Lo imposta come variabile d'ambiente
ENV ADDON_VERSION=$BUILD_VERSION

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN chmod a+x /usr/src/app/run.sh

EXPOSE 3000

CMD [ "/usr/src/app/run.sh" ]
