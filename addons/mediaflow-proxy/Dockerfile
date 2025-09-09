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

# Clona il repository e installa con pyproject.toml
RUN git clone https://github.com/nzo66/mediaflow-proxy.git . && \
    pip3 install .

# Copia script di avvio
COPY run.sh /
RUN chmod a+x /run.sh

# Esponi la porta
EXPOSE 8888

# Imposta il comando di avvio
CMD ["/run.sh"]
