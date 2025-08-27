ARG BUILD_FROM
FROM ${BUILD_FROM}

# Installa Python e dipendenze
RUN apk add --no-cache \
    python3 \
    python3-dev \
    py3-pip \
    build-base \
    curl \
    git

# Aggiorna pip
RUN pip3 install --upgrade pip

# Crea directory di lavoro
WORKDIR /app

# Scarica il repository e installa
RUN git clone https://github.com/mhdzumair/mediaflow-proxy.git . && \
    pip3 install -r requirements.txt && \
    pip3 install .

# Copia script di avvio
COPY run.sh /
RUN chmod a+x /run.sh

# Esponi la porta
EXPOSE 8888

# Imposta il comando di avvio
CMD ["/run.sh"]
