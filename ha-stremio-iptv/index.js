const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');
const sharp = require('sharp');
const os = require('os');
const { URL } = require('url');

// Configurazione Ambiente
const PORT = process.env.PORT || 3000;
const M3U_URL = process.env.M3U_URL;
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL = (parseInt(process.env.REFRESH_INTERVAL_MIN) || 60) * 60 * 1000;
const EASYPROXY_URL = process.env.EASYPROXY_URL?.replace(/\/$/, ''); 
const EASYPROXY_PASSWORD = process.env.EASYPROXY_PASSWORD;

// Rilevamento IP locale per i loghi
const LOCAL_IP = process.env.LOCAL_IP || (() => {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
})();

const LOGO_BASE_URL = process.env.LOGO_BASE_URL 
    ? process.env.LOGO_BASE_URL.replace(/\/$/, '')
    : `http://${LOCAL_IP}:${PORT}/logo`;

console.log(`[Init] Logo base URL: ${LOGO_BASE_URL}`);

// Mappa tvg-id → EPG (completa come prima)
const EPG_TVG_ID_MAP = {
  "sky.uno.it": "Sky.Uno.it",
  "sky.atlantic.it": "Sky.Atlantic.it",
  "sky.serie.it": "Sky.Serie.it",
  // ... (completa con tutti i canali)
};

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

function getDomain(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return '';
    }
}

function buildProxyUrl(channelUrl, clearkey = null) {
    const params = new URLSearchParams();
    params.set('d', channelUrl);  // EasyProxy accetta sia 'd' che 'url'
    
    if (EASYPROXY_PASSWORD) {
        params.set('api_password', EASYPROXY_PASSWORD);
    }
    
    if (clearkey) {
        params.set('clearkey', clearkey);
    }

    // Header richiesti dal CDN
    const domain = getDomain(channelUrl);
    if (domain) {
        params.set('h_referer', `${domain}/`);
        params.set('h_origin', domain);
    }
    params.set('h_user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 🔴 MODIFICA FONDAMENTALE: usa /proxy/stream.ts per i canali con DRM
    if (clearkey) {
        return `${EASYPROXY_URL}/proxy/stream.ts?${params.toString()}`;
    } else {
        return `${EASYPROXY_URL}/proxy/manifest.m3u8?${params.toString()}`;
    }
}

async function updateData() {
    console.log(`[Update] Scaricamento playlist originale...`);
    try {
        const { data } = await axios.get(M3U_URL, { timeout: 30000 });
        const lines = data.split('\n');
        const newChannels = [];
        const newGenres = new Set();
        
        let current = null;
        let pendingOptions = {};

        for (const line of lines) {
            const clean = line.trim();
            if (clean === '') continue;

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
                    options: pendingOptions
                };
                pendingOptions = {};
            } else if (!clean.startsWith('#') && current) {
                current.url = clean;
                const group = current.attrs['group-title'] || 'Altro';
                newGenres.add(group);
                const idHash = crypto.createHash('md5').update(current.url).digest('hex').substring(0, 10);
                
                const originalLogo = current.attrs['tvg-logo'] || null;
                const cleanName = current.name.replace(/\[.*?\]/g, '').trim();
                let logoUrl;
                if (originalLogo) {
                    logoUrl = `${LOGO_BASE_URL}?url=${encodeURIComponent(originalLogo)}&name=${encodeURIComponent(cleanName)}`;
                } else {
                    logoUrl = `${LOGO_BASE_URL}?name=${encodeURIComponent(cleanName)}`;
                }
                
                let clearkey = null;
                if (current.options) {
                    for (const [key, value] of Object.entries(current.options)) {
                        if (key.includes('license_key') || key.includes('clearkey')) {
                            clearkey = value.replace(/"/g, '');
                        }
                    }
                }

                const streamUrl = buildProxyUrl(current.url, clearkey);
                
                newChannels.push({
                    id: `iptv_${idHash}`,
                    type: 'tv',
                    name: current.name,
                    url: current.url,
                    streamUrl: streamUrl,
                    genre: group,
                    logo: logoUrl,
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

async function run() {
    await updateData();

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
            id: c.id,
            type: 'tv',
            name: c.name,
            poster: c.logo,
            posterShape: 'landscape',
            genres: [c.genre]
        }));
        return { metas };
    });

    builder.defineMetaHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };

        let epgId = ch.tvgId;
        if (epgId && EPG_TVG_ID_MAP[epgId]) {
            epgId = EPG_TVG_ID_MAP[epgId];
        }

        let desc = `Categoria: ${ch.genre}`;
        if (epgId && epgData[epgId] && epgData[epgId].length > 0) {
            desc += `\n\nORA IN ONDA:\n${epgData[epgId][0].title}`;
            if (epgData[epgId][0].desc) desc += `\n${epgData[epgId][0].desc}`;
        }

        return {
            meta: {
                id: ch.id,
                type: 'tv',
                name: ch.name,
                poster: ch.logo,
                posterShape: 'landscape',
                background: ch.logo,
                description: desc,
                genres: [ch.genre]
            }
        };
    });

    builder.defineStreamHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };

        console.log(`[Stream] ${ch.name} -> URL: ${ch.streamUrl}`);
        return {
            streams: [{
                title: 'EasyProxy Stream',
                url: ch.streamUrl,
                behaviorHints: { notWebReady: true, bingeGroup: "tv" }
            }]
        };
    });

    const app = express();

    // Endpoint logo (invariato)
    app.get('/logo', async (req, res) => {
        const start = Date.now();
        const { url, name } = req.query;
        console.log(`[Logo] Richiesta: ${url || 'nessun URL'}`);

        if (!url) {
            console.log('[Logo] Nessun URL, restituisco placeholder SVG.');
            res.type('svg').send(makePlaceholderSVG(name));
            return;
        }

        try {
            console.log(`[Logo] Scaricamento da: ${url}`);
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://guidatv.sky.it'
                }
            });

            console.log(`[Logo] Scaricato ${response.data.length} byte in ${Date.now()-start}ms`);

            const resized = await sharp(response.data)
                .resize(320, 180, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                })
                .png()
                .toBuffer();

            console.log(`[Logo] Ridimensionato in ${Date.now()-start}ms totali`);
            res.set({
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400'
            });
            res.send(resized);

        } catch (error) {
            console.error(`[Logo] ERRORE per ${url}: ${error.message}`);
            res.type('svg').send(makePlaceholderSVG(name || 'Logo'));
        }
    });

    function makePlaceholderSVG(text) {
        const safeText = (text || 'Canale').replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return Buffer.from(`
            <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#1a1a1a" width="320" height="180"/>
                <text fill="#ffffff" font-family="Arial" font-size="20" x="160" y="90" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
            </svg>
        `);
    }

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
        console.log(`[Logo] Endpoint base: ${LOGO_BASE_URL}`);
    });

    setInterval(async () => {
        await updateData();
        iface.manifest.catalogs[0].extra[0].options = Array.from(genres).sort();
    }, REFRESH_INTERVAL);
}

run();
