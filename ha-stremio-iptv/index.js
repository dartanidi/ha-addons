const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');

// Configurazione Ambiente
const PORT = process.env.PORT || 3000;
const M3U_URL = process.env.M3U_URL;  // Ora punta al Playlist Builder
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL = (parseInt(process.env.REFRESH_INTERVAL_MIN) || 60) * 60 * 1000;

let channels = [];
let genres = new Set();
let epgData = {};

async function downloadEPG(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (url.endsWith('.gz') || response.headers['content-type']?.includes('gzip')) {
        return zlib.gunzipSync(response.data).toString('utf-8');
    }
    return response.data.toString('utf-8');
}

async function updateData() {
    console.log(`[Update] Scaricamento playlist pre‑elaborata da EasyProxy...`);
    try {
        const { data } = await axios.get(M3U_URL, { timeout: 30000 });
        const lines = data.split('\n');
        const newChannels = [];
        const newGenres = new Set();
        
        let currentName = '';
        let currentAttrs = {};

        for (const line of lines) {
            const clean = line.trim();
            if (clean === '') continue;

            if (clean.startsWith('#EXTINF:')) {
                const attrs = {};
                const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
                let m;
                while ((m = attrRegex.exec(clean)) !== null) attrs[m[1]] = m[2];
                const nameMatch = clean.match(/,(.*)$/);
                currentName = nameMatch ? nameMatch[1].trim() : 'Unknown';
                currentAttrs = attrs;
            } else if (!clean.startsWith('#') && currentName) {
                // L'URL è già completo (p.es. https://mfp.bizdevs.eu/proxy/manifest.m3u8?...)
                const group = currentAttrs['group-title'] || 'Altro';
                newGenres.add(group);
                const idHash = crypto.createHash('md5').update(clean).digest('hex').substring(0, 10);
                
                newChannels.push({
                    id: `iptv_${idHash}`,
                    type: 'tv',
                    name: currentName,
                    url: clean,              // URL già pronto
                    genre: group,
                    logo: currentAttrs['tvg-logo'] || `https://via.placeholder.com/300x300/333333/FFFFFF?text=${encodeURIComponent(currentName)}`,
                    tvgId: currentAttrs['tvg-id'] || null
                });
                currentName = '';
                currentAttrs = {};
            }
        }
        channels = newChannels;
        genres = newGenres;
        console.log(`[M3U] Caricati ${channels.length} canali pre‑elaborati.`);
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

async function run() {
    await updateData();

    const manifest = {
        id: 'org.iptv.easyproxy',
        version: '1.0.0',
        name: 'HA IPTV Proxy',
        description: 'Live TV via EasyProxy (Playlist Builder)',
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
        if (extra && extra.genre) filtered = filtered.filter(c => c.genre === extra.genre);
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

        // L'URL è già completo, lo restituiamo direttamente
        console.log(`[Stream] ${ch.name} -> URL pre‑elaborato: ${ch.url}`);
        return {
            streams: [{
                title: 'EasyProxy Stream',
                url: ch.url,
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

    app.get('/manifest.json', (req, res) => {
        const m = builder.getInterface().manifest;
        m.catalogs[0].extra[0].options = Array.from(genres).sort();
        res.json(m);
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
