const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');
const sharp = require('sharp');
const os = require('os');
const fs = require('fs');

// ---------- Configurazione ----------
const PORT = process.env.PORT || 3000;
const DAMI_FILTER = process.env.DAMI_FILTER || "";
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL_MIN = parseInt(process.env.REFRESH_INTERVAL_MIN) || 60;
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

// ---------- Stato globale ----------
let channels = [];
let genres = new Set();
let epgMap = {};
let epgData = {};
let refreshTimer = null;
let filterKeywords = DAMI_FILTER ? DAMI_FILTER.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];

// ---------- Filtro canali italiani ----------
const PAESI_STRANIERI = ["[inglese]", "[hr]", "[nl]", "[pl]", "[cz]", "[de]", "[fr]", "[es]", "[pt]"];

function isItalianChannel(name) {
    if (!name) return false;
    const n = name.toLowerCase().trim();
    return !PAESI_STRANIERI.some(tag => n.includes(tag));
}

// ---------- Categorizzazione ----------
const CATEGORY_KEYWORDS = {
    "Rai": ["rai"],
    "Mediaset": ["twenty seven", "twentyseven", "mediaset", "italia 1", "italia 2", "canale 5", "la 5", "cine 34", "top crime", "iris", "focus", "rete 4"],
    "Sport": ["inter", "milan", "lazio", "calcio", "tennis", "sport", "sportitalia", "trsport", "sports", "super tennis", "supertennis", "dazn", "eurosport", "sky sport", "rai sport", "eventi", "lba"],
    "Film - Serie TV": ["crime", "primafila", "cinema", "movie", "film", "serie", "hbo", "fox", "rakuten", "atlantic", "collection", "investigation", "sky uno"],
    "News": ["news", "tg", "rai news", "sky tg", "tgcom", "euronews"],
    "Bambini": ["frisbee", "super!", "fresbee", "k2", "cartoon", "boing", "nick", "disney", "baby", "rai yoyo", "cartoonito", "kids"],
    "Documentari": ["documentaries", "discovery", "geo", "history", "nat geo", "nature", "arte", "documentary", "adventure"],
    "Musica": ["deejay", "rds", "hits", "rtl", "mtv", "vh1", "radio", "music", "kiss", "kisskiss", "m2o", "fm", "r101", "rai radio"],
    "Altro": []
};

function getCategory(name) {
    if (!name) return "Altro";
    const n = name.toLowerCase();
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (kws.some(kw => n.includes(kw))) return cat;
    }
    return "Altro";
}

// ---------- Alias EPG ----------
const NAME_ALIASES = {
    "sky sport basket": "sky sport nba",
};

// ---------- Logo LBA ----------
const LBA_LOGO = 'https://cdn-ukwest.onetrust.com/logos/f5e93496-e77f-4ca2-8146-3faeb1ca757e/0198c261-d9ca-7f63-82f1-d90a5fb77e79/f8007094-53bc-462e-a2bd-d92114873064/App_Store_1280_1x.png';
const EUROSPORT_LOGO = 'https://www.ci-portal.de/wp-content/uploads/eurosport.png';

// ---------- Utility ----------
function cleanNameForComparison(name) {
    if (!name) return "";
    return name.toLowerCase().replace(/\s*\+?\d+\s*/g, '').replace(/\bhd\b|\bfullhd\b|\b4k\b/gi, '').replace(/\bmaratone\b/gi, '').replace(/[^a-z0-9À-ÿ\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeName(name) {
    if (!name) return "";
    let n = name.toLowerCase().replace(/\s+/g, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\.it\b/g, '').replace(/hd|fullhd/gi, '');
    return n.replace(/[^a-z0-9À-ÿ]/g, '');
}

function parseDateUTC(dateStr) {
    if (!dateStr) return new Date();
    const match = dateStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (match) {
        const [, y, m, d, h, min, s, offset] = match;
        const date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s));
        if (offset) {
            const offsetMin = (offset[0] === '+' ? 1 : -1) * (parseInt(offset.slice(1, 3)) * 60 + parseInt(offset.slice(3, 5)));
            date.setUTCMinutes(date.getUTCMinutes() - offsetMin);
        }
        return date;
    }
    return new Date(dateStr);
}

// ---------- EPG ----------
async function downloadEPG(url) {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    if (url.endsWith('.gz') || resp.headers['content-type']?.includes('gzip')) {
        return zlib.gunzipSync(resp.data).toString('utf-8');
    }
    return resp.data.toString('utf-8');
}

async function updateEPG() {
    if (!EPG_URL) return;
    console.log('[EPG] Aggiornamento...');
    try {
        const xml = await downloadEPG(EPG_URL);
        const parsed = await new xml2js.Parser().parseStringPromise(xml);
        const newMap = {}, newData = {};

        if (parsed.tv?.channel) {
            for (const ch of parsed.tv.channel) {
                const id = ch.$.id;
                let name = '';
                if (ch['display-name']) {
                    const first = ch['display-name'][0];
                    if (typeof first === 'string') name = first;
                    else if (typeof first === 'object' && first._) name = first._;
                }
                let icon = '';
                if (ch.icon && Array.isArray(ch.icon)) {
                    for (const ic of ch.icon) {
                        if (ic.$ && ic.$.src) { icon = ic.$.src; break; }
                    }
                }
                if (id && name) newMap[normalizeName(name)] = { tvgId: id, logo: icon, originalName: name };
            }
        }

        if (parsed.tv?.programme) {
            for (const p of parsed.tv.programme) {
                const chId = p.$.channel;
                if (!newData[chId]) newData[chId] = [];
                newData[chId].push({
                    title: p.title?.[0]?._ || p.title?.[0] || 'Senza titolo',
                    desc: p.desc?.[0]?._ || p.desc?.[0] || '',
                    start: parseDateUTC(p.$.start),
                    stop: parseDateUTC(p.$.stop)
                });
            }
        }

        epgMap = newMap;
        epgData = newData;
        console.log(`[EPG] Pronta: ${Object.keys(epgMap).length} canali, ${Object.keys(epgData).length} con programmi`);
    } catch (e) {
        console.error(`[EPG] Errore: ${e.message}`);
    }
}

function findEpgInfo(channelName) {
    if (!epgMap || Object.keys(epgMap).length === 0 || !channelName) return {};

    const cleanName = channelName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const originalLower = cleanName.toLowerCase().trim();
    const searchFor = NAME_ALIASES[originalLower] || originalLower;

    for (const entry of Object.values(epgMap)) {
        if (entry.originalName.toLowerCase() === searchFor) return { tvgId: entry.tvgId, logo: entry.logo, epgOriginalName: entry.originalName };
    }
    const searchClean = cleanNameForComparison(searchFor);
    for (const entry of Object.values(epgMap)) {
        if (cleanNameForComparison(entry.originalName) === searchClean) return { tvgId: entry.tvgId, logo: entry.logo, epgOriginalName: entry.originalName };
    }
    for (const entry of Object.values(epgMap)) {
        const epgClean = cleanNameForComparison(entry.originalName);
        if (epgClean.includes(searchClean)) return { tvgId: entry.tvgId, logo: entry.logo, epgOriginalName: entry.originalName };
    }
    return {};
}

function extractClearkeyUaznao(url) {
    if (!url) return [];
    try {
        const m = url.match(/ck=([^&\s]+)/);
        if (!m) return [];
        const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
        const parts = decoded.split(':');
        return parts.length >= 2 ? [`${parts[0]}:${parts[1]}`] : [];
    } catch { return []; }
}

function buildStreamUrl(streamUrl, clearkeys, disableSsl = false, redirectStream = false) {
    const params = new URLSearchParams();
    params.set('url', streamUrl || '');
    if (EASYPROXY_PASSWORD) params.set('api_password', EASYPROXY_PASSWORD);
    if (clearkeys && clearkeys.length > 0) {
        clearkeys.forEach(ck => params.append('clearkey', ck));
    }
    if (disableSsl) params.set('disable_ssl', '1');
    if (redirectStream) params.set('redirect_stream', 'true');
    return `${EASYPROXY_URL}/proxy/manifest.m3u8?${params.toString()}`;
}

async function resolveDamiTvUrl(channelId) {
    try {
        const resolveUrl = `https://dami-tv.pro/papi/tv/resolve/${channelId}`;
        const resp = await axios.get(resolveUrl, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://dami-tv.pro/' }
        });
        const data = resp.data;
        let streamUrl = data.stream || data.url;
        if (streamUrl) {
            if (streamUrl.startsWith('/')) streamUrl = `https://dami-tv.pro${streamUrl}`;
            return streamUrl;
        }
        return null;
    } catch (e) { return null; }
}

async function resolveDlhdUrl(channelId) {
    try {
        const url = `https://dami-tv.pro/papi/tv/dlhd/${channelId}/playlist.m3u8`;
        const resp = await axios.get(url, {
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400,
            headers: { 'Referer': 'https://dami-tv.pro/', 'User-Agent': 'Mozilla/5.0' }
        });
        
        let finalUrl = resp.headers.location;
        if (finalUrl) {
             if (finalUrl.startsWith('/')) finalUrl = `https://dami-tv.pro${finalUrl}`;
             return finalUrl;
        }
        return url;
    } catch (e) {
        if (e.response && e.response.headers && e.response.headers.location) {
             let finalUrl = e.response.headers.location;
             if (finalUrl.startsWith('/')) finalUrl = `https://dami-tv.pro${finalUrl}`;
             return finalUrl;
        }
        return null;
    }
}

// ---------- Build Multi-Sorgente ----------
async function buildChannels() {
    const channelsMap = new Map();
    const newGenres = new Set();

    function addOrUpdateChannel(name, category, logoUrl, tvgId, sourceData) {
        const normalized = cleanNameForComparison(name) || name.toLowerCase();
        if (!channelsMap.has(normalized)) {
            channelsMap.set(normalized, {
                id: `iptv_multi_${crypto.createHash('md5').update(normalized).digest('hex').substring(0, 10)}`,
                type: 'tv',
                name: name,
                genre: category,
                logo: logoUrl,
                tvgId: tvgId,
                sources: {}
            });
            newGenres.add(category);
        }
        Object.assign(channelsMap.get(normalized).sources, sourceData);
    }

    // 1. Fetch CDNLiveTV (Sports99)
    try {
        console.log('[CDNLive] Download lista canali TV...');
        const { data } = await axios.get('https://api.cdnlivetv.tv/api/v1/channels/?user=cdnlivetv&plan=free', { timeout: 30000 });
        if (data && data.channels) {
            for (const item of data.channels) {
                if (item.code !== 'it') continue;
                let name = (item.name || '').trim();
                if (!name) continue;

                if (filterKeywords.length > 0) {
                    if (!filterKeywords.some(kw => name.toLowerCase().includes(kw))) continue;
                }

                const category = getCategory(name);
                const epgInfo = findEpgInfo(name);
                let logo = item.image || epgInfo.logo || '';
                const logoUrl = logo ? `${LOGO_BASE_URL}?url=${encodeURIComponent(logo)}&name=${encodeURIComponent(name)}` : `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`;
                
                addOrUpdateChannel(name, category, logoUrl, epgInfo.tvgId || '', { cdnLiveUrl: item.url });
            }
            console.log('[CDNLive] Canali italiani processati.');
        }
    } catch (e) { console.error(`[CDNLive] Errore: ${e.message}`); }

    // 2. Fetch DamiTV & DLHD
    async function elaboraDami(urlData, tipo) {
        try {
            console.log(`[${tipo}] Download lista canali TV...`);
            const { data } = await axios.get(urlData, { timeout: 30000 });
            if (data && data.channels) {
                for (const item of data.channels) {
                    if (item.country !== 'it' && item.country !== 'Italy') continue;
                    let name = (item.name || '').trim().replace(/ Italy$/i, '').trim();
                    if (!name) continue;

                    if (filterKeywords.length > 0) {
                        if (!filterKeywords.some(kw => name.toLowerCase().includes(kw))) continue;
                    }

                    const category = getCategory(name);
                    const epgInfo = findEpgInfo(name);
                    let logo = item.image || epgInfo.logo || '';

                    if (name.toLowerCase().startsWith('lba')) logo = LBA_LOGO;
                    else if (name.toLowerCase().startsWith('eurosport')) logo = EUROSPORT_LOGO;
                    else if (name.toLowerCase().startsWith('sky ')) {
                        logo = (epgInfo.logo && epgInfo.epgOriginalName && epgInfo.epgOriginalName.toLowerCase().startsWith('sky')) 
                            ? epgInfo.logo : 'https://upload.wikimedia.org/wikipedia/commons/d/db/Sky_logo_2025.svg';
                    } else if (name.toLowerCase().startsWith('dazn')) {
                        logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/DAZN_logo.svg/1024px-DAZN_logo.svg.png';
                    }

                    const logoUrl = logo ? `${LOGO_BASE_URL}?url=${encodeURIComponent(logo)}&name=${encodeURIComponent(name)}` : `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`;
                    
                    if (tipo === 'DamiTV') addOrUpdateChannel(name, category, logoUrl, epgInfo.tvgId || '', { damiId: item.id });
                    else addOrUpdateChannel(name, category, logoUrl, epgInfo.tvgId || '', { dlhdId: item.id });
                }
                console.log(`[${tipo}] Canali italiani processati.`);
            }
        } catch (e) { console.error(`[${tipo}] Errore: ${e.message}`); }
    }

    await elaboraDami('https://dami-tv.pro/data/tv-channels.json', 'DamiTV');
    await elaboraDami('https://dami-tv.pro/data/dlhd-channels.json', 'DLHD');

    // 3. Extra locali
    const extraPath = '/config/liste/extra.json';
    if (fs.existsSync(extraPath)) {
        try {
            const extraArray = JSON.parse(fs.readFileSync(extraPath, 'utf-8'));
            if (Array.isArray(extraArray)) {
                for (const item of extraArray) {
                    const name = (item.channelName || '').trim();
                    if (!name) continue;
                    const category = getCategory(name);
                    let cleanUrl = (item.url || '').replace(/ck=[^&\s]+&?/, '').replace(/[?&]$/, '');
                    addOrUpdateChannel(name, category, `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`, '', { 
                        localUrl: cleanUrl, 
                        localCk: extractClearkeyUaznao(item.url) 
                    });
                }
            }
        } catch (e) {}
    }

    channels = Array.from(channelsMap.values());
    genres = newGenres;
    console.log(`[Totale] ${channels.length} canali univoci pronti (con multi-sorgente).`);
}

function scheduleNextRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    const delayMs = REFRESH_INTERVAL_MIN * 60 * 1000;
    refreshTimer = setTimeout(() => updateChannels(), delayMs);
}

async function updateChannels() {
    console.log('[Update] Inizio aggiornamento multi-sorgente...');
    await buildChannels();
    scheduleNextRefresh();
}

function scheduleEPG() {
    if (!EPG_URL) return;
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0, 0));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => { updateEPG(); scheduleEPG(); }, delay);
}

// ---------- Stremio ----------
let builder, iface;

async function run() {
    await updateEPG();
    await updateChannels();
    scheduleEPG();

    const manifest = {
        id: 'org.iptv.arta',
        version: process.env.ADDON_VERSION || '2.0.0',
        name: 'Arta LiveTV',
        description: 'Streaming Live TV Multi-Sorgente',
        resources: ['catalog', 'meta', 'stream'],
        types: ['tv'],
        catalogs: [{
            type: 'tv', id: 'iptv_live', name: 'Canali TV',
            extra: [
                { name: 'genre', isRequired: false, options: Array.from(genres).sort() },
                { name: 'search', isRequired: false }, { name: 'skip', isRequired: false }
            ]
        }],
        idPrefixes: ['iptv_'],
        behaviorHints: { configurable: false },
        logo: "https://dl.strem.io/addon-logo.png"
    };

    builder = new addonBuilder(manifest);

    builder.defineCatalogHandler(async ({ extra }) => {
        let f = channels;
        if (extra?.genre) f = f.filter(c => c.genre === extra.genre);
        if (extra?.search) { const q = extra.search.toLowerCase(); f = f.filter(c => c.name.toLowerCase().includes(q)); }
        const skip = extra?.skip ? parseInt(extra.skip) : 0;
        const metas = f.slice(skip, skip + 100).map(c => ({
            id: c.id, type: 'tv', name: c.name, poster: c.logo, posterShape: 'landscape', genres: [c.genre]
        }));
        return { metas };
    });

    builder.defineMetaHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };
        let desc = `Categoria: ${ch.genre}\nSorgenti disponibili: ` + Object.keys(ch.sources).join(', ');
        if (ch.tvgId && epgData[ch.tvgId]) {
            const programmes = epgData[ch.tvgId];
            if (programmes.length) {
                const now = new Date();
                const current = programmes.find(p => p.start <= now && p.stop > now) || programmes[0];
                desc += `\n\nORA IN ONDA:\n${current.title}`;
                if (current.desc) desc += `\n${current.desc}`;
            }
        }
        return { meta: { id: ch.id, type: 'tv', name: ch.name, poster: ch.logo, posterShape: 'landscape', background: ch.logo, description: desc, genres: [ch.genre] } };
    });

    builder.defineStreamHandler(async ({ id }) => {
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };
        console.log(`[Stream] Richiesto: ${ch.name}`);
        
        const streams = [];

        // 1. Sorgente DamiTV
        if (ch.sources.damiId) {
            const resolved = await resolveDamiTvUrl(ch.sources.damiId);
            if (resolved) streams.push({ title: '✅ Dami-TV (Generico)', url: buildStreamUrl(resolved, []), behaviorHints: { notWebReady: true, bingeGroup: "tv" } });
        }

        // 2. Sorgente DLHD
        if (ch.sources.dlhdId) {
            const resolved = await resolveDlhdUrl(ch.sources.dlhdId);
            if (resolved) streams.push({ title: '⭐ DLHD (Premium)', url: buildStreamUrl(resolved, []), behaviorHints: { notWebReady: true, bingeGroup: "tv" } });
        }

        // 3. Sorgente CDNLive (Sports99)
        if (ch.sources.cdnLiveUrl) {
            streams.push({ title: '🔥 Sports99 (Redirect)', url: buildStreamUrl(ch.sources.cdnLiveUrl, [], false, true), behaviorHints: { notWebReady: true, bingeGroup: "tv" } });
        }

        // 4. Extra Locale
        if (ch.sources.localUrl) {
            streams.push({ title: '📁 Locale (Extra)', url: buildStreamUrl(ch.sources.localUrl, ch.sources.localCk || []), behaviorHints: { notWebReady: true, bingeGroup: "tv" } });
        }
        
        return { streams };
    });

    const app = express();
    app.get('/logo', async (req, res) => {
        const { url, name } = req.query;
        if (!url) { res.type('svg').send(makePlaceholderSVG(name)); return; }
        try {
            const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://guidatv.sky.it' } });
            const resized = await sharp(resp.data).resize(320, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } }).png().toBuffer();
            res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }).send(resized);
        } catch { res.type('svg').send(makePlaceholderSVG(name || 'Logo')); }
    });
    function makePlaceholderSVG(text) {
        const safe = (text || 'Canale').replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return Buffer.from(`<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"><rect fill="#000000" width="320" height="180"/><text fill="#ffffff" font-family="Arial" font-size="20" x="160" y="90" text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`);
    }
    app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); if (req.method === 'OPTIONS') return res.sendStatus(200); next(); });
    app.get('/manifest.json', (req, res) => { const m = builder.getInterface().manifest; m.catalogs[0].extra[0].options = Array.from(genres).sort(); res.json(m); });
    iface = builder.getInterface();
    app.use('/', getRouter(iface));
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Arta LiveTV sulla porta ${PORT}`));
}

run();
