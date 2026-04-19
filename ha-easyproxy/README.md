# Home Assistant Add-on: EasyProxy (Light)

Questo è un add-on non ufficiale per Home Assistant che permette di eseguire **EasyProxy** all'interno di un container gestito. Questa è la versione **Light** ottimizzata per limitare l'uso delle risorse.

## ⚠️ Limitazioni Versione Light
Per mantenere l'add-on leggero e stabile su hardware come Raspberry Pi, questa build **NON include**:
* Supporto al sistema DVR / Registrazioni.
* Solvers per bypass Cloudflare aggressivi (Deltabit, Mixdrop).
* Modulo Cloudflare WARP (VPN).

Include invece regolarmente **Playwright (Chromium headless)** per l'estrazione dai provider che richiedono un'interazione browser base (es. DLStreams).

## ℹ️ Crediti & Riferimento Originale
Tutto il merito per il software **EasyProxy** va allo sviluppatore originale.
* **Repository Originale:** [https://github.com/realbestia1/EasyProxy](https://github.com/realbestia1/EasyProxy)

---

## 🚀 Installazione

1. Aggiungi il repository **https://github.com/dartanidi/ha-addons** al tuo Add-on Store di Home Assistant.
2. Cerca "EasyProxy" e clicca su Installa.
3. Attendi pazientemente. L'installazione richiede il download e la compilazione di Chromium e FFmpeg, potrebbe impiegare dai 5 ai 15 minuti a seconda del dispositivo.
4. Avvia l'add-on.

## ⚙️ Configurazione

Puoi configurare il proxy direttamente dalla scheda "Configurazione" dell'add-on.

| Opzione | Descrizione |
| :--- | :--- |
| `global_proxy` | (Opzionale) URL del proxy di fallback. |
| `transport_routes` | (Opzionale) Sistema di proxy routing basato su patterns URL. |
| `mpd_mode` | (legacy / ffmpeg) Modalità processing MPD. `ffmpeg` richiede molta CPU. |
| `port` | (Opzionale) Porta di ascolto del proxy. Default 7860. |
| `password` | (Opzionale) Password API per proteggere il proxy. |
| `workers` | Numero di processi paralleli Gunicorn (default 2). Aumentalo se hai un server potente. |
| `log_level` | Livello di verbosità dei log (default WARNING). |

## 📚 Utilizzo

Una volta avviato, il proxy sarà disponibile all'indirizzo:
`http://<IP-HOME-ASSISTANT>:<PORTA-SCELTA>` (default 7860).
