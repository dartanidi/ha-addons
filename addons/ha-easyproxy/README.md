# Home Assistant Add-on: EasyProxy

Questo è un add-on non ufficiale per Home Assistant che permette di eseguire **EasyProxy** all'interno di un container gestito.

## ⚠️ Credits & Riferimento Originale

Tutto il merito per il software **EasyProxy** va allo sviluppatore originale **nzo66**.
Questo add-on è semplicemente un "contenitore" per facilitare l'installazione su Home Assistant OS.

* **Repository Originale:** [https://github.com/nzo66/EasyProxy](https://github.com/nzo66/EasyProxy)
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

1.  Aggiungi questo repository al tuo Add-on Store di Home Assistant.
2.  Cerca "EasyProxy" e clicca su Installa.
3.  Attendi qualche minuto (l'installazione compila le dipendenze Python, potrebbe richiedere tempo su Raspberry Pi).
4.  Avvia l'add-on.

## ⚙️ Configurazione

Puoi configurare i proxy esterni direttamente dalla scheda "Configurazione" dell'add-on. Non è necessario modificare file `.env`.

| Opzione | Descrizione |
| :--- | :--- |
| `global_proxy` | (Opzionale) URL del proxy globale per tutto il traffico (es. `http://user:pass@ip:port`). |
| `dlhd_proxy` | (Opzionale) Proxy specifico per DaddyLiveHD (supporta lista separata da virgole). |
| `vavoo_proxy` | (Opzionale) Proxy specifico per Vavoo. |
| `port` | (Opzionale) Porta di ascolto del proxy. Default 7860. |
| `password` | (Opzionale) Password di protezione del proxy da utilizzi indesiderati. |

## 📚 Utilizzo

Una volta avviato, l'interfaccia web sarà disponibile all'indirizzo:
`http://<IP-HOME-ASSISTANT>:<PORTA-SCELTA>` (default 7860)

Esempi di URL per i player (VLC, Kodi, TiviMate):
```text
http://<IP-HA>:7860/proxy/manifest.m3u8?url=[https://example.com/stream.m3u8](https://example.com/stream.m3u8)
