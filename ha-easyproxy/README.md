# EasyProxy Light - Home Assistant Add-on

Un Server Proxy Universale HLS leggero e ottimizzato per Home Assistant. 

Questa è la versione **Light** di EasyProxy, progettata per consumare pochissime risorse, avviarsi istantaneamente ed evitare i crash di sistema sui dispositivi meno potenti (come i Raspberry Pi).

## 🚀 Caratteristiche Principali

* **Ultra-Leggero:** Rimosso Gunicorn, DVR e FlareSolverr per un'impronta in RAM minima.
* **Server Nativo:** Utilizza direttamente il server web asincrono AIOHTTP.
* **Playwright/Chromium Ready:** Display virtuale (`Xvfb`) integrato per supportare gli estrattori video complessi (come DLStreams) senza crash.
* **Rete Host NATIVA:** Utilizza `host_network: true` per azzerare i problemi di instradamento di Home Assistant e garantire che i flussi video escano fluidi verso le tue Smart TV o player.
* **Zero-Config:** Installi, avvii e funziona.

---

## 📦 Installazione

1. Copia la cartella `ha-easyproxy` (o come l'hai nominata) all'interno della cartella condivisa `/addons/` del tuo server Home Assistant.
2. Vai su **Impostazioni** > **Componenti aggiuntivi** > **Raccolta** (Add-on Store).
3. Clicca sui tre puntini in alto a destra e seleziona **Ricarica**.
4. Scorri fino in fondo alla pagina, troverai la sezione dei tuoi Add-on locali.
5. Clicca su **EasyProxy Light** e poi su **Installa**.

---

## ⚙️ Configurazione

L'add-on si affida alla rete Host di Home Assistant. Questo significa che aprirà le porte direttamente sull'IP del tuo server domotico.

Nella scheda **Configurazione** dell'Add-on puoi personalizzare i seguenti parametri:

| Parametro | Tipo | Predefinito | Descrizione |
| :--- | :--- | :--- | :--- |
| `port` | Numero | `7860` | La porta su cui il proxy sarà in ascolto. (Es. se imposti 8888, il proxy risponderà su `http://IP_HA:8888`). |
| `mpd_mode` | Lista | `legacy` | Modalità di conversione dei flussi MPD (`legacy` o `ffmpeg`). |
| `password` | Stringa | *Vuoto* | (Opzionale) Password per proteggere l'accesso alle API del proxy. |
| `global_proxy` | Stringa | *Vuoto* | (Opzionale) Indirizzo proxy globale per mascherare il traffico in uscita. |
| `transport_routes`| Stringa | *Vuoto* | (Opzionale) Regole di routing avanzate. |
| `log_level` | Lista | `WARNING` | Livello dei log visibili nella scheda "Log" (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

---

## 🖥️ Utilizzo

1. Dopo aver configurato la porta (o lasciato la 7860 di default), clicca su **Avvia**.
2. Attendi qualche secondo e vai nella scheda **Log** per verificare che ci sia la scritta: `🚀 Starting HLS Proxy Server...`.
3. Torna nella scheda **Info** e clicca sul pulsante blu **APRI INTERFACCIA WEB**.
4. Verrai reindirizzato automaticamente alla pagina di gestione del proxy.

### Endpoint Principali

Se vuoi usare il proxy direttamente nei tuoi lettori IPTV (come Tivimate) o script, l'URL base è:
`http://<IP_HOME_ASSISTANT>:<PORTA>/`

* **Generatore Playlist:** `/playlist?url=<definitions>`
* **Proxy Stream Principale:** `/proxy/manifest.m3u8?url=<URL>`

*(Nota: Se hai impostato una `password` nella configurazione, dovrai aggiungerla alle tue richieste API).*

---

## ⚠️ Risoluzione dei problemi (Troubleshooting)

* **L'add-on si ferma subito dopo l'avvio:** Controlla che la porta specificata in `port` non sia già utilizzata da un altro servizio o add-on (es. un altro server web) sul tuo Home Assistant. Cambia la porta e riavvia.
* **I log mostrano errori di "Xvfb":** Assicurati di non aver rimosso `Xvfb` dal Dockerfile. Il display virtuale è essenziale per il funzionamento dei provider in modalità headless.
* **Non riesco a raggiungere la WebUI:** Ricorda di usare l'**Indirizzo IP Locale** di Home Assistant (`http://192.168.x.x:7860`). I servizi come Nabu Casa o DuckDNS (HTTPS) non reindirizzano automaticamente le porte personalizzate degli add-on in rete host.

---
*Creato per la community di Home Assistant.*
