const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');

// Configurazione Ambiente
const PORT = process.env.PORT || 3000;
const M3U_URL = process.env.M3U_URL;
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL = (parseInt(process.env.REFRESH_INTERVAL_MIN) || 60) * 60 * 1000;
const EASYPROXY_URL = process.env.EASYPROXY_URL?.replace(/\/$/, ''); 
const EASYPROXY_PASSWORD = process.env.EASYPROXY_PASSWORD;

let channels = [];
let genres = new Set();
let epgData = {};

// Helper per EPG (GZIP support)
async function downloadEPG(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (url.endsWith('.gz') || response.headers['content-type']?.includes('gzip')) {
        return zlib.gunzipSync(response.data).toString('utf-8');
    }
    return response.data.toString('utf-8');
}

async function updateData() {
    console.log(`[Update] Lettura dati in corso...`);
    try {
        const { data } = await axios.get(M3U_URL, { timeout: 30000 });
        const lines = data.split('\n');
        const newChannels = [];
        const newGenres = new Set();
        
        let current = null;
        let pendingOptions = {}; // Salva le opzioni extra (#EXTVLCOPT o chiavi) tra le righe

        for (const line of lines) {
            const clean = line.trim();
            if (clean === '') continue;

            // Cattura opzioni VLC/Kodi extra (es: #KODIPROP:inputstream.adaptive.license_key=...)
            if (clean.startsWith('#KODIPROP:') || clean.startsWith('#EXTVLCOPT:')) {
                const optMatch = clean.match(/[#\w]+:(.*)=(.*)/);
                if (optMatch) {
                    const key = optMatch[1].toLowerCase();
                    const val = optMatch[2];
                    pendingOptions[key] = val;
                }
                continue;
            }

            if (clean.startsWith('#EXTINF:')) {
                const attrs = {};
                const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
                let m;
                while ((m = attrRegex.exec(clean)) !== null) attrs[m[1]] = m[2];
                const nameMatch = clean.match(/,(.*)$/);
                
                current = { 
                    name: nameMatch ? nameMatch[1].trim() : 'Unknown', 
                    attrs: attrs,
                    options: pendingOptions // Assegna le opzioni accumulate
                };
                pendingOptions = {}; // Resetta per il canale successivo
            } else if (!clean.startsWith('#') && current) {
                current.url = clean;
                const group = current.attrs['group-title'] || 'Altro';
                newGenres.add(group);
                const idHash = crypto.createHash('md5').update(current.url).digest('hex').substring(0, 10);
                
                newChannels.push({
                    id: `iptv_${idHash}`,
                    type: 'tv',
                    name: current.name,
                    url: current.url,
                    genre: group,
                    logo: current.attrs['tvg-logo'] || `https://via.placeholder.com/300x300/333333/FFFFFF?text=${encodeURIComponent(current.name)}`,
                    tvgId: current.attrs['tvg-id'] || null,
                    options: current.options // Salviamo le chiavi estratte
                });
                current = null;
            }
        }
        channels = newChannels;
        genres = newGenres;
        console.log(`[M3U] Caricati ${channels.length} canali.`);
    } catch (e) { console.error(`[M3U] Errore: ${e.message}`); }

    if (EPG_URL) {
        try {
            const data = await downloadEPG(EPG_URL);
            const result = await (new xml2js.Parser()).parseStringPromise(data);
            epgData = {};
            if (result.tv && result.tv.programme) {
                result.tv.programme.forEach(p => {
                    const ch = p.$.channel;
                    if (!epgData[ch]) epgData[ch] = [];
                    epgData[ch].push({ 
                        title: p.title ? (p.title[0]._ || p.title[0]) : 'Unknown',
                        desc: p.desc ? (p.desc[0]._ || p.desc[0]) : ''
                    });
                });
            }
            console.log(`[EPG] Caricata per ${Object.keys(epgData).length} canali.`);
        } catch (e) { console.error(`[EPG] Errore: ${e.message}`); }
    }
}

// Funzione di avvio principale
async function run() {
    await updateData();

    const manifest = {
        id: 'org.iptv.easyproxy',
        version: '1.0.0',
        name: 'HA IPTV Proxy',
        description: 'Live TV via EasyProxy con supporto DRM/Keys',
        resources: ['catalog', 'meta', 'stream'],
        types: ['tv'],
        catalogs: [{
            type: 'tv',
            id: 'iptv_live',
            name: 'Canali TV',
            extra: [
                { name: 'genre', isRequired: false, options: Array.from(genres).sort() },
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }],
        idPrefixes: ['iptv_'],
        behaviorHints: { configurable: false },
        logo: "https://dl.strem.io/addon-logo.png"
    };

    const builder = new addonBuilder(manifest);

    builder.defineCatalogHandler(async ({ extra }) => {
        let filtered = channels;
        if (extra && extra.genre) {
            filtered = filtered.filter(c => c.genre === extra.genre);
        }
        if (extra && extra.search) {
            const query = extra.search.toLowerCase();
            filtered = filtered.filter(c => c.name.toLowerCase().includes(query));
        }
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const metas = filtered.slice(skip, skip + 100).map(c => ({
            id: c.id, type: 'tv', name: c.name, poster: c.logo, posterShape: 'square', genres: [c.genre]
        }));
        return { metas };
    });

    builder.defineMetaHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };

        let desc = `Categoria: ${ch.genre}`;
        if (ch.tvgId && epgData[ch.tvgId] && epgData[ch.tvgId].length > 0) {
            desc += `\n\nORA IN ONDA:\n${epgData[ch.tvgId][0].title}`;
            if (epgData[ch.tvgId][0].desc) desc += `\n${epgData[ch.tvgId][0].desc}`;
        }

        return {
            meta: {
                id: ch.id, type: 'tv', name: ch.name, poster: ch.logo, posterShape: 'square', background: ch.logo, description: desc, genres: [ch.genre]
            }
        };
    });

    builder.defineStreamHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };

        // Costruzione dinamica dei parametri per EasyProxy basati sulle opzioni lette dalla M3U
        let extraParams = '';
        
        // Verifica se ci sono chiavi di decriptazione ClearKey (spesso in inputstream.adaptive.license_key)
        if (ch.options && Object.keys(ch.options).length > 0) {
            for (const [key, value] of Object.entries(ch.options)) {
                // Selezioniamo le chiavi ClearKey
                if (key.includes('license_key') || key.includes('clearkey')) {
                    // Formato tipico: {"keys":[{"kty":"oct","k":"BASE64_KEY","kid":"BASE64_ID"}],"type":"temporary"}
                    // Oppure formato diretto: KID:KEY
                    // Lo passiamo direttamente come key_json o raw_key a EasyProxy (dipende dalla sua implementazione)
                    // EasyProxy "Light" tipicamente legge le ClearKey passandole come stringa nel paramentro 'key' o 'ck'
                    const cleanKey = value.replace(/"/g, ''); // Rimuove eventuali apici
                    extraParams += `&clearkey=${encodeURIComponent(cleanKey)}`; 
                }
                // Selezioniamo gli header (User-Agent, Referer)
                if (key.includes('http-user-agent')) {
                    extraParams += `&h_user-agent=${encodeURIComponent(value)}`;
                }
                if (key.includes('http-referer')) {
                    extraParams += `&h_referer=${encodeURIComponent(value)}`;
                }
            }
        }

        // Se non troviamo header specifici, possiamo forzare un User-Agent generico per evitare blocchi 403
        if (!extraParams.includes('h_user-agent')) {
            extraParams += `&h_user-agent=${encodeURIComponent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')}`;
        }

        // Assemblaggio finale
        const proxyUrl = `${EASYPROXY_URL}/proxy/hls/manifest.m3u8?d=${encodeURIComponent(ch.url)}&api_password=${EASYPROXY_PASSWORD}&format=hls${extraParams}`;
        
        console.log(`[Stream] Richiesto: ${ch.name} (Parametri estratti: ${Object.keys(ch.options || {}).length})`);

        return {
            streams: [{
                title: 'EasyProxy Stream (DRM Support)',
                url: proxyUrl,
                behaviorHints: { notWebReady: true, bingeGroup: "tv" }
            }]
        };
    });

    const app = express();

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    const iface = builder.getInterface();
    app.use('/', getRouter(iface));

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Addon in ascolto sulla porta ${PORT}`);
    });

    setInterval(async () => {
        await updateData();
        iface.manifest.catalogs[0].extra[0].options = Array.from(genres).sort();
    }, REFRESH_INTERVAL);
}

run();
