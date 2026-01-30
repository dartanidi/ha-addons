# Home Assistant Add-on: EasyProxy

Questo è un add-on non ufficiale per Home Assistant che permette di eseguire **EasyProxy** all'interno di un container gestito.

## ⚠️ Credits & Riferimento Originale

Tutto il merito per il software **EasyProxy** va allo sviluppatore originale **stremio-manager**.
Questo add-on è semplicemente un "contenitore" per facilitare l'installazione su Home Assistant OS.

* **Repository Originale:** [https://github.com/stremio-manager/EasyProxy](https://github.com/stremio-manager/EasyProxy)
* **Segnalazione Bug Software:** Se il proxy non decodifica uno stream o ha errori interni, per favore verifica prima sul repository originale.
* **Segnalazione Bug Add-on:** Se l'add-on non si installa o non si avvia su Home Assistant, apri una issue in questo repository.

---

## ℹ️ Descrizione

EasyProxy è un server proxy universale per streaming HLS, M3U8 e IPTV.
Caratteristiche principali supportate dal progetto originale:
* Supporto nativo per Vavoo, DaddyLive HD e altri servizi.
* Interfaccia web integrata.
* Decrittazione DRM (ClearKey).
* Conversione automatica DASH → HLS.

## 🚀 Installazione

1.  Aggiungi il repository **https://github.com/dartanidi/ha-addons** al tuo Add-on Store di Home Assistant.
2.  Cerca "EasyProxy" e clicca su Installa.
3.  Attendi qualche minuto (l'installazione compila le dipendenze Python, potrebbe richiedere tempo su Raspberry Pi).
4.  Avvia l'add-on.

## ⚙️ Configurazione

Puoi configurare i proxy esterni direttamente dalla scheda "Configurazione" dell'add-on.

| Opzione | Descrizione |
| :--- | :--- |
| `global_proxy` | (Opzionale) URL del proxy di fallback. |
| `transport_routes` | (Opzionale) Sistema avanzato di proxy routing basato su patterns URL. |
| `mpd_mode` | (default su legacy) Modalità di processing degli MPD. **Attenzione, in modalità ffmpeg richiede una considerevole capacità di calcolo, per cui non funziona bene su molti PC ad uso Home Assistant**. |
| `port` | (Opzionale) Porta di ascolto del proxy. Default 7860. |
| `password` | (Opzionale) Password di protezione del proxy da utilizzi indesiderati. |

## 📚 Utilizzo

Una volta avviato, il proxy sarà disponibile all'indirizzo:
`http://<IP-HOME-ASSISTANT>:<PORTA-SCELTA>` (default 7860).

Per esporre il proxy all'esterno è necessario utilizzare un reverse proxy come NGINX Proxy Manager o simile.

**N.B. Qualora ci siano degli aggiornamenti al repository originale per nuove fix e/o implementazioni, per aggiornare il proxy locale è sufficiente effettuare il rebuild/ricostruzione dell'add-on. Non verranno rilasciate nuove versioni dell'add-on a meno di nuove implementazioni che non potranno essere abilitate mediante semplice ricostruzione**

