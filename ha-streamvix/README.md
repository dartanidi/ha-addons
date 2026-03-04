# Home Assistant Add-on: StreamViX

Questo add-on permette di eseguire [StreamViX](https://github.com/qwertyuiop8899/StreamViX) localmente sul tuo server Home Assistant. 

StreamViX è un potente add-on per Stremio che estrae sorgenti streaming per film, serie TV, anime (AnimeUnity, AnimeSaturn) e gestisce canali TV Live ed Eventi Sportivi avanzati tramite il supporto di MediaFlow Proxy.

## 🚀 Installazione

Essendo un add-on locale personalizzato, l'installazione avviene in pochi passaggi:

1. Copia la cartella `streamvix` (contenente `config.yaml`, `Dockerfile`, `run.sh` e questo `README.md`) nella directory `/addons/` del tuo Home Assistant.
2. Vai su **Impostazioni** > **Componenti aggiuntivi** > **Negozio dei componenti aggiuntivi**.
3. Clicca sui tre puntini in alto a destra e seleziona **Controlla aggiornamenti**.
4. Scorri fino in fondo: troverai la sezione "Componenti aggiuntivi locali" con **StreamViX Add-on**.
5. Clicca su **Installa**. *(Nota: la prima installazione può richiedere diversi minuti poiché scaricherà l'ambiente Node/Python e clonerà l'ultima versione del codice da GitHub).*

## ⚙️ Configurazione

Prima di avviare l'add-on, vai nella scheda **Configurazione** e imposta le tue opzioni. 

### Opzioni di Base
* **`mfp_url`** (Obbligatorio per flussi sportivi/protetti): L'URL del tuo MediaFlow Proxy (es. `https://mfp.tuodominio.com`).
* **`mfp_password`**: La password del tuo MediaFlow Proxy.
* **`tmdb_api_key`** (Opzionale): La tua chiave API di TMDB per i metadati.
* **`addon_base_url`** (Consigliato): L'indirizzo base pubblico o locale del tuo add-on, **senza slash finale** (es. `http://192.168.1.100:7860`). Questo è molto importante per le installazioni locali per ottenere correttamente i flussi VixSrc in Full HD (synthetic endpoint).

### Eventi Sportivi Avanzati (Backend)
A differenza di film e serie, gli eventi sportivi vengono scaricati e processati in background dall'add-on ogni 2 ore (o ogni tot minuti per gli stream live). Usa queste opzioni per abilitare o disabilitare le fonti:

* **`streamed_enable`**: Abilita l'arricchimento tramite playlist Streamed. Usa un algoritmo tollerante per associare flussi a eventi singoli (F1, MotoGP) o partite.
* **`rbtv_enable`**: Abilita l'arricchimento tramite RBTV/RB77. Focalizzato sui **flussi italiani**, aggiunge automaticamente le emoji dinamiche (🚫 se manca tanto all'inizio, 🔴 se è live).
* **`spso_enable`**: Abilita l'uso della playlist di backup SportSOnline.
* **`pd_enable`**: (Disabilitato di default). Cerca flussi prioritari dei broadcaster ufficiali e li forza in cima alla lista degli stream.
* **`tvtap_enable`**: (Disabilitato di default). Abilita l'estrazione dai canali TVTap.

### Limiti Estrattore
* **`fast_dynamic`**: Se abilitato (`true`), salta l'estrattore e restituisce i link IPTV direttamente a Stremio (i flussi saranno etichettati come `[Player Esterno]`).
* **`dynamic_extractor_conc`**: (Default: 10). Limita le estrazioni simultanee per non sovraccaricare il proxy. I flussi oltre questo limite vengono passati come diretti.

## 🌐 Rete (Importante!)

Prima di avviare, vai nella scheda **Rete** dell'add-on e assegna una porta per l'host. Il default consigliato è `7860`. 
Assicurati di salvare.

## 🎮 Utilizzo con Stremio

1. Avvia l'add-on da Home Assistant.
2. Controlla la scheda **Log** per assicurarti che non ci siano errori e che l'avvio di Node sia andato a buon fine.
3. Apri il browser e vai all'indirizzo del tuo Home Assistant sulla porta configurata (es. `http://192.168.1.100:7860`).
4. Si aprirà la Web UI di StreamViX. Controlla che il badge `Addon Base URL` mostri il tuo IP/Dominio.
5. Clicca su **Installa** per aggiungere l'add-on al tuo account Stremio.

## 🔄 Aggiornamenti

Il `Dockerfile` di questo add-on è impostato per clonare automaticamente l'ultimo commit dal repository ufficiale di StreamViX. 
Se in futuro esce un aggiornamento importante di StreamViX, ti basterà andare nella pagina dell'add-on in Home Assistant e cliccare su **Ricostruisci** per scaricare e compilare l'ultima versione.
