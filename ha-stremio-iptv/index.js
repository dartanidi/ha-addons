const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');
const sharp = require('sharp');
const os = require('os');

const PORT = process.env.PORT || 3000;
const M3U_URL = process.env.M3U_URL;
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL = (parseInt(process.env.REFRESH_INTERVAL_MIN) || 60) * 60 * 1000;
const EASYPROXY_URL = process.env.EASYPROXY_URL?.replace(/\/$/, ''); 
const EASYPROXY_PASSWORD = process.env.EASYPROXY_PASSWORD;

const LOCAL_IP = process.env.LOCAL_IP || (() => {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
})();

const LOGO_BASE_URL = process.env.LOGO_BASE_URL?.replace(/\/$/, '') || `http://${LOCAL_IP}:${PORT}/logo`;

console.log(`[Init] Logo endpoint: ${LOGO_BASE_URL}`);

const EPG_TVG_ID_MAP = {
  "sky.uno.it": "Sky.Uno.it", "sky.atlantic.it": "Sky.Atlantic.it", "sky.serie.it": "Sky.Serie.it",
  "sky.investigation.it": "Sky.Investigation.it", "sky.crime.it": "Sky.Crime.it",
  "sky.documentaries.it": "Sky.Documentaries.it", "sky.nature.it": "Sky.Nature.it",
  "sky.arte.it": "Sky.Arte.it", "sky.adventure.it": "Sky.Adventure.it", "skycollection": "Sky.Collection.it",
  "sky.cinema.uno.it": "Sky.Cinema.Uno.it", "sky.cinema.action.it": "Sky.Cinema.Action.it",
  "sky.cinema.comedy.it": "Sky.Cinema.Comedy.it", "sky.cinema.drama.it": "Sky.Cinema.Drama.it",
  "sky.cinema.due.it": "Sky.Cinema.Due.it", "sky.cinema.romance.it": "Sky.Cinema.Romance.it",
  "sky.cinema.suspense.it": "Sky.Cinema.Suspense.it", "sky.cinema.collection.it": "Sky.Cinema.Collection.it",
  "skycinemaillumination": "Sky.Cinema.Illumination.it",
  "sky.sport.24.it": "Sky.Sport.24.it", "sky.sport.uno.it": "Sky.Sport.Uno.it",
  "sky.sport.arena.it": "Sky.Sport.Arena.it", "sky.sport.calcio.it": "Sky.Sport.Calcio.it",
  "sky.sport.f1.it": "Sky.Sport.F1.it", "sky.sport.max.it": "Sky.Sport.Max.it",
  "sky.sport.mix.it": "Sky.Sport.Mix.it", "sky.sport.motogp.it": "Sky.Sport.MotoGP.it",
  "sky.sport.tennis.it": "Sky.Sport.Tennis.it", "sky.sport.golf.it": "Sky.Sport.Golf.it",
  "skysportbasket": "Sky.Sport.Basket.it", "sky.sport.legend.it": "Sky.Sport.Legend.it",
  "sky.sport..251.it": "Sky.Sport.251.it", "sky.sport..252.it": "Sky.Sport.252.it",
  "sky.sport..253.it": "Sky.Sport.253.it", "sky.sport..254.it": "Sky.Sport.254.it",
  "sky.sport..255.it": "Sky.Sport.255.it", "sky.sport..256.it": "Sky.Sport.256.it",
  "sky.sport..257.it": "Sky.Sport.257.it", "sky.sport..258.it": "Sky.Sport.258.it",
  "sky.sport..259.it": "Sky.Sport.259.it", "sky.tg24.it": "Sky.TG24.it",
  "comedy.central.it": "Comedy.Central.it", "mtv.hd.it": "MTV.HD.it",
  "gambero.rosso.hd.it": "Gambero.Rosso.HD.it", "classica.hd.it": "Classica.HD.it",
  "tv8.hd.it": "TV8.HD.it", "super!.it": "Super!.it",
};

let channels = [], genres = new Set(), epgData = {};

async function downloadEPG(url) {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (url.endsWith('.gz') || r.headers['content-type']?.includes('gzip'))
        return zlib.gunzipSync(r.data).toString('utf-8');
    return r.data.toString('utf-8');
}

async function updateData() {
    console.log(`[Update] Chiamata al Playlist Builder...`);
    try {
        const bp = new URLSearchParams(); bp.set('url', M3U_URL);
        if (EASYPROXY_PASSWORD) bp.set('api_password', EASYPROXY_PASSWORD);
        const builderUrl = `${EASYPROXY_URL}/playlist?${bp.toString()}`;
        const { data } = await axios.get(builderUrl, { timeout: 30000 });
        const lines = data.split('\n');
        const nc = [], ng = new Set();
        let cName = '', cAttr = {};
        for (const line of lines) {
            const clean = line.trim();
            if (!clean) continue;
            if (clean.startsWith('#EXTINF:')) {
                const attrs = {}, re = /(\w+(?:-\w+)*)="([^"]*)"/g; let m;
                while ((m = re.exec(clean))) attrs[m[1]] = m[2];
                const nm = clean.match(/,(.*)$/);
                cName = nm ? nm[1].trim() : 'Unknown'; cAttr = attrs;
            } else if (!clean.startsWith('#') && cName) {
                const group = cAttr['group-title'] || 'Altro'; ng.add(group);
                const idHash = crypto.createHash('md5').update(clean).digest('hex').substring(0, 10);
                const originalLogo = cAttr['tvg-logo'] || null;
                const cleanName = cName.replace(/\[.*?\]/g, '').trim();
                const logoUrl = originalLogo
                    ? `${LOGO_BASE_URL}?url=${encodeURIComponent(originalLogo)}&name=${encodeURIComponent(cleanName)}`
                    : `${LOGO_BASE_URL}?name=${encodeURIComponent(cleanName)}`;
                nc.push({ id: `iptv_${idHash}`, type: 'tv', name: cName, url: clean,
                    genre: group, logo: logoUrl, tvgId: cAttr['tvg-id'] || null });
                cName = ''; cAttr = {};
            }
        }
        channels = nc; genres = ng;
        console.log(`[M3U] Caricati ${channels.length} canali.`);
    } catch (e) { console.error(`[M3U] Errore: ${e.message}`); }

    if (EPG_URL) {
        try {
            const data = await downloadEPG(EPG_URL);
            const result = await (new xml2js.Parser()).parseStringPromise(data);
            epgData = {};
            if (result.tv?.programme) result.tv.programme.forEach(p => {
                const ch = p.$.channel; if (!epgData[ch]) epgData[ch] = [];
                epgData[ch].push({ 
                    title: p.title ? (p.title[0]._ || p.title[0]) : 'Unknown',
                    desc: p.desc ? (p.desc[0]._ || p.desc[0]) : '' });
            });
            console.log(`[EPG] Pronta per ${Object.keys(epgData).length} canali.`);
        } catch (e) { console.error(`[EPG] Errore: ${e.message}`); }
    }
}

function run() {
    updateData();
    const manifest = {
        id: 'org.iptv.arta', version: '1.0.0',
        name: 'ARTA LIVETV', description: 'Streaming Live TV con supporto DRM',
        resources: ['catalog', 'meta', 'stream'], types: ['tv'],
        catalogs: [{
            type: 'tv', id: 'iptv_live', name: 'Canali TV',
            extra: [
                { name: 'genre', isRequired: false, options: Array.from(genres).sort() },
                { name: 'search', isRequired: false }, { name: 'skip', isRequired: false }
            ]
        }],
        idPrefixes: ['iptv_'], behaviorHints: { configurable: false },
        logo: "https://dl.strem.io/addon-logo.png"
    };
    const builder = new addonBuilder(manifest);

    builder.defineCatalogHandler(async ({ extra }) => {
        let f = channels;
        if (extra?.genre) f = f.filter(c => c.genre === extra.genre);
        if (extra?.search) { const q = extra.search.toLowerCase(); f = f.filter(c => c.name.toLowerCase().includes(q)); }
        const skip = extra?.skip ? parseInt(extra.skip) : 0;
        const metas = f.slice(skip, skip + 100).map(c => ({ id: c.id, type: 'tv', name: c.name, poster: c.logo, posterShape: 'landscape', genres: [c.genre] }));
        return { metas };
    });

    builder.defineMetaHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };
        let epgId = ch.tvgId; if (epgId && EPG_TVG_ID_MAP[epgId]) epgId = EPG_TVG_ID_MAP[epgId];
        let desc = `Categoria: ${ch.genre}`;
        if (epgId && epgData[epgId]?.length > 0) {
            desc += `\n\nORA IN ONDA:\n${epgData[epgId][0].title}`;
            if (epgData[epgId][0].desc) desc += `\n${epgData[epgId][0].desc}`;
        }
        return { meta: { id: ch.id, type: 'tv', name: ch.name, poster: ch.logo, posterShape: 'landscape', background: ch.logo, description: desc, genres: [ch.genre] } };
    });

    builder.defineStreamHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };
        console.log(`[Stream] ${ch.name}`);
        return { streams: [{ title: 'Stream in Diretta', url: ch.url, behaviorHints: { notWebReady: true, bingeGroup: "tv" } }] };
    });

    const app = express();
    app.get('/logo', async (req, res) => {
        const { url, name } = req.query;
        if (!url) { res.type('svg').send(makePlaceholderSVG(name)); return; }
        try {
            const logoResp = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://guidatv.sky.it' } });
            const resized = await sharp(logoResp.data).resize(320, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } }).png().toBuffer();
            res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }).send(resized);
        } catch (e) { res.type('svg').send(makePlaceholderSVG(name || 'Logo')); }
    });

    function makePlaceholderSVG(text) {
        const safeText = (text || 'Canale').replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return Buffer.from(`<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"><rect fill="#1a1a1a" width="320" height="180"/><text fill="#ffffff" font-family="Arial" font-size="20" x="160" y="90" text-anchor="middle" dominant-baseline="middle">${safeText}</text></svg>`);
    }

    app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); if (req.method === 'OPTIONS') return res.sendStatus(200); next(); });
    app.get('/manifest.json', (req, res) => { const m = builder.getInterface().manifest; m.catalogs[0].extra[0].options = Array.from(genres).sort(); res.json(m); });
    const iface = builder.getInterface();
    app.use('/', getRouter(iface));
    app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 ARTA LIVETV in ascolto sulla porta ${PORT}`); });
    setInterval(async () => { await updateData(); iface.manifest.catalogs[0].extra[0].options = Array.from(genres).sort(); }, REFRESH_INTERVAL);
}

run();
