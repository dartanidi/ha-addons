# Home Assistant Add-on: StreamViX

Questo add-on permette di eseguire [StreamViX](https://github.com/qwertyuiop8899/StreamViX) localmente sul tuo server Home Assistant. 

StreamViX è un potente add-on per Stremio che estrae sorgenti streaming per film, serie TV, anime (AnimeUnity, AnimeSaturn) e gestisce canali TV Live ed Eventi Sportivi avanzati tramite il supporto di MediaFlow Proxy.

## 🚀 Installazione

Puoi installare questo add-on aggiungendo il repository personalizzato al tuo Home Assistant:

1. Vai in **Impostazioni** > **Componenti aggiuntivi** > **Negozio dei componenti aggiuntivi** (in basso a destra).
2. Clicca sui tre puntini in alto a destra e seleziona **Repository**.
3. Incolla l'URL del repository: `https://github.com/dartanidi/ha-addons` e clicca su **Aggiungi**.
4. Chiudi la finestra dei repository e ricarica la pagina (o clicca su **Controlla aggiornamenti** sempre dal menu a tendina in alto a destra).
5. Scorri la pagina fino a trovare la sezione dedicata al repository appena aggiunto e clicca su **StreamViX Add-on** (oppure cercalo tramite la barra di ricerca).
6. Clicca su **Installa**. *(Nota: l'installazione scaricherà l'ambiente Node/Python e clonerà l'ultima versione del codice originale da GitHub, quindi potrebbe richiedere alcuni minuti).*

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

Quando usciranno nuove versioni nel repository `ha-addons`, Home Assistant ti notificherà l'aggiornamento. 
Inoltre, poiché il `Dockerfile` clona direttamente l'ultima versione dal repository ufficiale di StreamViX, se hai bisogno di forzare l'aggiornamento del codice interno senza aspettare un bump di versione su HA, puoi semplicemente cliccare su **Ricostruisci** nella pagina dell'add-on.
