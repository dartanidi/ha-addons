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

        for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('#EXTINF:')) {
                const attrs = {};
                const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
                let m;
                while ((m = attrRegex.exec(clean)) !== null) attrs[m[1]] = m[2];
                const nameMatch = clean.match(/,(.*)$/);
                current = { name: nameMatch ? nameMatch[1].trim() : 'Unknown', attrs };
            } else if (clean && !clean.startsWith('#') && current) {
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
                    tvgId: current.attrs['tvg-id'] || null
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
    // 1. SCARICA I DATI PRIMA DI CREARE IL MANIFEST
    await updateData();

    // 2. CREA IL MANIFEST AUTORIZZANDO ESPLICITAMENTE SKIP E SEARCH
    const manifest = {
        id: 'org.iptv.easyproxy',
        version: '1.0.0',
        name: 'HA IPTV Proxy',
        description: 'Live TV via EasyProxy',
        resources: ['catalog', 'meta', 'stream'],
        types: ['tv'],
        catalogs: [{
            type: 'tv',
            id: 'iptv_live',
            name: 'Canali TV',
            extra: [
                { name: 'genre', isRequired: false, options: Array.from(genres).sort() },
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false } // Risolve l'errore 404
            ]
        }],
        idPrefixes: ['iptv_'],
        behaviorHints: { configurable: false },
        logo: "https://dl.strem.io/addon-logo.png"
    };

    const builder = new addonBuilder(manifest);

    // Gestione Catalogo
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
            id: c.id,
            type: 'tv',
            name: c.name,
            poster: c.logo,
            posterShape: 'square',
            genres: [c.genre]
        }));
        return { metas };
    });

    // Gestione Metadati
    builder.defineMetaHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };

        let desc = `Categoria: ${ch.genre}`;
        if (ch.tvgId && epgData[ch.tvgId] && epgData[ch.tvgId].length > 0) {
            desc += `\n\nORA IN ONDA:\n${epgData[ch.tvgId][0].title}`;
            if (epgData[ch.tvgId][0].desc) {
                desc += `\n${epgData[ch.tvgId][0].desc}`;
            }
        }

        return {
            meta: {
                id: ch.id,
                type: 'tv',
                name: ch.name,
                poster: ch.logo,
                posterShape: 'square',
                background: ch.logo,
                description: desc,
                genres: [ch.genre]
            }
        };
    });

    // Gestione Stream
    builder.defineStreamHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };

        const proxyUrl = `${EASYPROXY_URL}/live?url=${encodeURIComponent(ch.url)}&password=${EASYPROXY_PASSWORD}`;
        console.log(`[Stream] Richiesto: ${ch.name}`);

        return {
            streams: [{
                title: 'EasyProxy Stream',
                url: proxyUrl
            }]
        };
    });

    const app = express();

    // Middleware CORS
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    // Monta le rotte dell'SDK (creando i vari endpoint /catalog, /meta, /stream)
    const iface = builder.getInterface();
    app.use('/', getRouter(iface));

    // Avvia server
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Addon in ascolto sulla porta ${PORT}`);
    });

    // Avvia loop aggiornamenti
    setInterval(async () => {
        await updateData();
        // Aggiorna silenziosamente il manifest in memoria per le nuove categorie
        iface.manifest.catalogs[0].extra[0].options = Array.from(genres).sort();
    }, REFRESH_INTERVAL);
}

// Lancia l'app
run();
