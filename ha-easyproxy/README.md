# EasyProxy Light (64-bit Edition) - Home Assistant App

Versione ultra-leggera e ottimizzata del Server Proxy Universale HLS per Home Assistant. 

Questa versione è progettata specificamente per sistemi a **64-bit** (Raspberry Pi 4/5 con HAOS 64-bit o MiniPC x86_64) e utilizza il browser di sistema per ridurre drasticamente l'occupazione di memoria sulla MicroSD/SSD.

## 🚀 Caratteristiche Principali

* **System Chromium Optimization:** Risparmio di circa 500MB di spazio disco utilizzando i binari nativi di Debian.
* **64-bit Native:** Supporto esclusivo per `aarch64` e `amd64` per garantire stabilità e prestazioni.
* **Zero-Config Network:** Utilizza la modalità Rete Host nativa per eliminare conflitti di mapping.
* **FlareSolverr Bridge:** Predisposizione per il collegamento a un'istanza esterna di FlareSolverr.

---

## 🌍 Accesso Esterno

Se si desidera garantire l'accesso esterno alla propria istanza di EasyProxy Light (ad esempio per utilizzare i flussi fuori casa), si consiglia caldamente l'utilizzo di soluzioni sicure come:

* **Cloudflared (Cloudflare Tunnel)**
* **Nginx Proxy Manager**

**Nota bene:** Per implementare correttamente l'accesso esterno con queste App, è necessario possedere un **dominio valido** (es. `tuodominio.it`) correttamente configurato e puntato verso il proprio server.

---

## 📦 Installazione tramite Repository (Consigliato)

Per installare questa App, segui questi passaggi:

1. Vai sul tuo **Home Assistant**.
2. Naviga in **Impostazioni** > **Componenti aggiuntivi** > **Store delle App**.
3. Clicca sui tre puntini in alto a destra e seleziona **Repository**.
4. Aggiungi il seguente URL:  
   `https://github.com/dartanidi/ha-addons`
5. Clicca su **Aggiungi** e poi chiudi il popup.
6. Cerca **EasyProxy Light** nella lista (potrebbe essere necessario aggiornare la pagina) e clicca su **Installa**.

---

## ⚙️ Configurazione

Nella scheda **Configurazione**, puoi personalizzare i seguenti parametri:

| Parametro | Descrizione |
| :--- | :--- |
| `port` | Porta su cui risponderà il proxy (Default: `7860`). |
| `api_password` | Password opzionale per proteggere l'accesso al proxy. |
| `global_proxy` | Indirizzo di un proxy esterno per mascherare tutto il traffico. |
| `transport_routes` | Regole di routing avanzate (es. `{URL=vavoo.to, PROXY=...}`). |
| `log_level` | Livello di dettaglio dei log (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `flaresolverr_url` | URL di un'istanza esterna di FlareSolverr (es. `http://192.168.1.50:8191`). |
| `flaresolverr_timeout` | Tempo massimo di attesa per la risoluzione dei captcha (Default: 60s). |

---

## 🛠️ Manutenzione e Aggiornamento

L'App scarica l'ultima versione del codice sorgente di EasyProxy direttamente da GitHub durante la fase di installazione o ricostruzione.

Per forzare l'aggiornamento all'ultima versione del codice originale:
1. Vai nella pagina dell'App.
2. Clicca sui tre puntini in alto a destra.
3. Seleziona **Ricostruisci** (Rebuild).

---

## 🖥️ Esempio di Utilizzo

Una volta avviata, l'App è raggiungibile all'indirizzo IP del tuo Home Assistant:
* **URL Base:** `http://IP_HA:PORTA/`
* **Playlist:** `http://192.168.1.100:7860/playlist?url=URL_SORGENTE`

Se hai impostato una `api_password`, aggiungila all'URL:
`http://192.168.1.100:7860/playlist?url=...&api_password=TUA_PASS`

---

## ⚠️ Requisiti di Sistema

Questa App richiede un'architettura a **64-bit**. 
Verifica che il tuo sistema sia compatibile (`aarch64` o `x86_64`) prima dell'installazione. L'architettura `armv7` (32-bit) non è supportata.

---

## 🤝 Crediti e Progetto Originale

Questa App è un pacchetto (wrapper) ottimizzato per Home Assistant. 
Tutto il "motore" proxy, la logica di estrazione e il codice Python originale sono stati sviluppati e sono mantenuti da **realbestia1**.

Per supportare il suo fantastico lavoro, visita il repository ufficiale e lascia una ⭐:
👉 **[Repository Originale di EasyProxy](https://github.com/realbestia1/EasyProxy)**

---
*Manutenuto nel repository: https://github.com/dartanidi/ha-addons*
