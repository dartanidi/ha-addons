const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');
const sharp = require('sharp');
const os = require('os');
const fs = require('fs');   // <-- nuovo import

// ---------- Configurazione ----------
const PORT = process.env.PORT || 3000;
const UAZNAO_URL = process.env.UAZNAO_URL;
const ZAPPR_URL = process.env.ZAPPR_URL || 'https://channels.zappr.stream/it/dtt/national.json';
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
let currentUaznaoUrl = UAZNAO_URL;
let lastSkyExpiry = null;

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

// ---------- Ricerca EPG ----------
function findEpgInfo(channelName) {
    if (!epgMap || Object.keys(epgMap).length === 0 || !channelName) return {};
    const originalLower = channelName.toLowerCase().trim();
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
        if (epgClean.includes(searchClean) || searchClean.includes(epgClean)) return { tvgId: entry.tvgId, logo: entry.logo, epgOriginalName: entry.originalName };
    }
    return {};
}

// ---------- Estrazione clearkey ----------
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

function extractClearkeyZappr(details) {
    if (!details) return null;
    if (typeof details === 'string') return [details];
    if (typeof details === 'object') {
        const keys = Object.keys(details);
        if (keys.length !== 1) return null;
        const firstKey = keys[0];
        return [`${firstKey}:${details[firstKey]}`];
    }
    return null;
}

// ---------- Costruzione URL EasyProxy ----------
function buildStreamUrl(streamUrl, clearkeys, disableSsl = false) {
    const params = new URLSearchParams();
    params.set('url', streamUrl || '');
    if (EASYPROXY_PASSWORD) params.set('api_password', EASYPROXY_PASSWORD);
    if (clearkeys && clearkeys.length > 0) {
        clearkeys.forEach(ck => params.append('clearkey', ck));
    }
    if (disableSsl) params.set('disable_ssl', '1');
    return `${EASYPROXY_URL}/proxy/manifest.m3u8?${params.toString()}`;
}

// ---------- Fallback URL Uaznao ----------
async function fetchNewUaznaoUrl() {
    console.log('[Fallback] Tentativo di recuperare nuovo URL Uaznao...');
    try {
        const { data } = await axios.get('https://telegra.ph/PREMIUM-TV-05-05-2', { timeout: 15000 });
        const match = data.match(/https:\/\/uaznao\.com\/premium\/temp\.php\?token=([a-f0-9]+)/i);
        if (match) {
            const newToken = match[1];
            const newUrl = `https://uaznao.com/premium/temp.php?token=${newToken}`;
            console.log(`[Fallback] Nuovo URL trovato: ${newUrl}`);
            return newUrl;
        }
        console.error('[Fallback] Nessun token trovato nella pagina Telegram.');
    } catch (e) {
        console.error(`[Fallback] Errore nel recupero nuovo URL: ${e.message}`);
    }
    return null;
}

// ---------- Fetch & merge ----------
async function buildChannels() {
    const newChannels = [], newGenres = new Set(), allTitles = new Set();

    // --- Uaznao ---
    let uaznaoArray = null;
    if (currentUaznaoUrl) {
        console.log('[Uaznao] Download...');
        try {
            const { data } = await axios.get(currentUaznaoUrl, { timeout: 30000 });
            uaznaoArray = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data).find(v => Array.isArray(v)) : null);
            if (!uaznaoArray) {
                console.error('[Uaznao] Nessun array trovato. Avvio fallback...');
                const newUrl = await fetchNewUaznaoUrl();
                if (newUrl) {
                    currentUaznaoUrl = newUrl;
                    const { data: newData } = await axios.get(currentUaznaoUrl, { timeout: 30000 });
                    uaznaoArray = Array.isArray(newData) ? newData : Object.values(newData).find(v => Array.isArray(v));
                }
            }
        } catch (e) {
            console.error(`[Uaznao] Errore download: ${e.message}. Avvio fallback...`);
            const newUrl = await fetchNewUaznaoUrl();
            if (newUrl) {
                currentUaznaoUrl = newUrl;
                try {
                    const { data: newData } = await axios.get(currentUaznaoUrl, { timeout: 30000 });
                    uaznaoArray = Array.isArray(newData) ? newData : Object.values(newData).find(v => Array.isArray(v));
                } catch (e2) {
                    console.error(`[Uaznao] Anche il fallback è fallito: ${e2.message}`);
                }
            }
        }
    }

    if (uaznaoArray) {
        for (const item of uaznaoArray) {
            const name = (item.channelName || '').trim();
            if (!name || !isItalianChannel(name)) continue;

            if (name.toLowerCase().includes('[uk]') || name.toLowerCase().includes('spotv2') || name.toLowerCase().includes('tsn1') || name.toLowerCase().includes('tsn2') || name.toLowerCase().includes('tsn3') || name.toLowerCase().includes('tsn4') || name.toLowerCase().includes('tsn5')) continue;
            const excludeCategories = ['portogallo', 'uk', 'tnt sports'];
            if (item.category && excludeCategories.includes(item.category.toLowerCase())) continue;

            const category = getCategory(name);
            const clearkeys = extractClearkeyUaznao(item.url);
            const cleanUrl = (item.url || '').replace(/ck=[^&\s]+&?/, '').replace(/[?&]$/, '');
            const streamUrl = buildStreamUrl(cleanUrl, clearkeys);

            const epgInfo = findEpgInfo(name);
            const tvgId = epgInfo.tvgId || '';
            let logo = '';

            if (name.toLowerCase().startsWith('lba')) {
                logo = LBA_LOGO;
            } else if (name.toLowerCase().startsWith('sky ')) {
                if (epgInfo.logo && epgInfo.epgOriginalName && epgInfo.epgOriginalName.toLowerCase().startsWith('sky')) {
                    logo = epgInfo.logo;
                } else {
                    logo = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Sky_logo_2025.svg';
                }
            } else {
                logo = epgInfo.logo || '';
            }

            const logoUrl = logo ? `${LOGO_BASE_URL}?url=${encodeURIComponent(logo)}&name=${encodeURIComponent(name)}` : `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`;

            newChannels.push({
                id: `iptv_${crypto.createHash('md5').update(streamUrl).digest('hex').substring(0, 10)}`,
                type: 'tv', name, url: streamUrl, genre: category, logo: logoUrl, tvgId
            });
            newGenres.add(category);
            allTitles.add(name.toLowerCase());
        }
        console.log(`[Uaznao] ${newChannels.length} canali italiani.`);
    }

    // --- Extra (canali locali) ---
    const extraPath = '/config/liste/extra.json';
    if (fs.existsSync(extraPath)) {
        console.log('[Extra] Caricamento canali locali...');
        try {
            const extraRaw = fs.readFileSync(extraPath, 'utf-8');
            const extraArray = JSON.parse(extraRaw);
            if (Array.isArray(extraArray)) {
                for (const item of extraArray) {
                    const name = (item.channelName || '').trim();
                    if (!name || !isItalianChannel(name) || allTitles.has(name.toLowerCase())) continue;

                    // Stessi controlli di esclusione di Uaznao
                    if (name.toLowerCase().includes('[uk]') || name.toLowerCase().includes('spotv2') || name.toLowerCase().includes('tsn1') || name.toLowerCase().includes('tsn2') || name.toLowerCase().includes('tsn3') || name.toLowerCase().includes('tsn4') || name.toLowerCase().includes('tsn5')) continue;
                    const excludeCategories = ['portogallo', 'uk', 'tnt sports'];
                    if (item.category && excludeCategories.includes(item.category.toLowerCase())) continue;

                    const category = getCategory(name);
                    const clearkeys = extractClearkeyUaznao(item.url);   // stesso formato
                    const cleanUrl = (item.url || '').replace(/ck=[^&\s]+&?/, '').replace(/[?&]$/, '');
                    const streamUrl = buildStreamUrl(cleanUrl, clearkeys);

                    const epgInfo = findEpgInfo(name);
                    const tvgId = epgInfo.tvgId || '';
                    let logo = '';

                    if (name.toLowerCase().startsWith('lba')) {
                        logo = LBA_LOGO;
                    } else if (name.toLowerCase().startsWith('sky ')) {
                        if (epgInfo.logo && epgInfo.epgOriginalName && epgInfo.epgOriginalName.toLowerCase().startsWith('sky')) {
                            logo = epgInfo.logo;
                        } else {
                            logo = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Sky_logo_2025.svg';
                        }
                    } else {
                        logo = epgInfo.logo || '';
                    }

                    const logoUrl = logo ? `${LOGO_BASE_URL}?url=${encodeURIComponent(logo)}&name=${encodeURIComponent(name)}` : `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`;

                    newChannels.push({
                        id: `iptv_${crypto.createHash('md5').update(streamUrl).digest('hex').substring(0, 10)}`,
                        type: 'tv', name, url: streamUrl, genre: category, logo: logoUrl, tvgId
                    });
                    newGenres.add(category);
                    allTitles.add(name.toLowerCase());
                }
                console.log(`[Extra] ${newChannels.length} canali dopo merge.`);
            }
        } catch (e) {
            console.error(`[Extra] Errore parsing: ${e.message}`);
        }
    }

    // --- Zappr ---
    if (ZAPPR_URL) {
        console.log('[Zappr] Download...');
        try {
            const { data } = await axios.get(ZAPPR_URL, { timeout: 30000 });
            const zapprChannels = Array.isArray(data) ? data : (data?.channels || []);
            for (const ch of zapprChannels) {
                const name = (ch.name || '').trim();
                if (!name || !isItalianChannel(name) || allTitles.has(name.toLowerCase())) continue;

                if (name.toLowerCase().includes('spotv2') || name.toLowerCase().includes('tsn1') || name.toLowerCase().includes('tsn2') || name.toLowerCase().includes('tsn3') || name.toLowerCase().includes('tsn4') || name.toLowerCase().includes('tsn5')) continue;

                const unsupportedTypes = ['iframe', 'youtube', 'twitch', 'popup'];
                if (!ch.type || unsupportedTypes.includes(ch.type)) continue;

                let urlToUse = ch.url;
                let licensedetails = ch.licensedetails;
                if (ch.geoblock && ch.geoblock.url && ch.geoblock.url !== true) {
                    urlToUse = ch.geoblock.url;
                    if (ch.geoblock.licensedetails) licensedetails = ch.geoblock.licensedetails;
                }
                if (!urlToUse || urlToUse.startsWith('zappr://')) continue;

                let clearkeys = null;
                if (ch.license === 'clearkey' || (ch.geoblock && ch.geoblock.license === 'clearkey')) {
                    clearkeys = extractClearkeyZappr(licensedetails);
                    if (!clearkeys) continue;
                }

                const disableSsl = urlToUse.includes('uvotv.zappr.stream') || urlToUse.includes('netplus.zappr.stream');
                const streamUrl = buildStreamUrl(urlToUse, clearkeys || [], disableSsl);

                const category = getCategory(name);
                const epgInfo = findEpgInfo(name);
                const tvgId = epgInfo.tvgId || '';
                let logo = '';

                if (name.toLowerCase().startsWith('lba')) {
                    logo = LBA_LOGO;
                } else if (name.toLowerCase().startsWith('sky ')) {
                    if (epgInfo.logo && epgInfo.epgOriginalName && epgInfo.epgOriginalName.toLowerCase().startsWith('sky')) {
                        logo = epgInfo.logo;
                    } else {
                        logo = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Sky_logo_2025.svg';
                    }
                } else {
                    logo = epgInfo.logo || '';
                }
                if (!logo && ch.logo) {
                    logo = `https://channels.zappr.stream/logos/it/optimized/${ch.logo}`;
                }

                const logoUrl = logo ? `${LOGO_BASE_URL}?url=${encodeURIComponent(logo)}&name=${encodeURIComponent(name)}` : `${LOGO_BASE_URL}?name=${encodeURIComponent(name)}`;

                newChannels.push({
                    id: `iptv_${crypto.createHash('md5').update(streamUrl).digest('hex').substring(0, 10)}`,
                    type: 'tv', name, url: streamUrl, genre: category, logo: logoUrl, tvgId
                });
                newGenres.add(category);
                allTitles.add(name.toLowerCase());
            }
            console.log(`[Zappr] ${newChannels.length} canali italiani aggiunti.`);
        } catch (e) { console.error(`[Zappr] Errore: ${e.message}`); }
    }

    channels = newChannels;
    genres = newGenres;
    console.log(`[Totale] ${channels.length} canali.`);
}

// ---------- Scheduling intelligente ----------
function getSkyCinemaExpiry(uaznaoData) {
    if (!uaznaoData || !Array.isArray(uaznaoData)) return null;
    const possibleNames = ['Sky Cinema Uno', 'Sky Cinema 1'];
    for (const targetName of possibleNames) {
        const skyCinema = uaznaoData.find(item => item.channelName && item.channelName.toLowerCase().trim() === targetName.toLowerCase());
        if (skyCinema && skyCinema.expiresAt) {
            const d = new Date(skyCinema.expiresAt);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
}

function scheduleNextRefresh(uaznaoData) {
    if (refreshTimer) clearTimeout(refreshTimer);

    const skyExpiry = getSkyCinemaExpiry(uaznaoData);
    let delayMs;

    if (skyExpiry) {
        const now = Date.now();
        if (lastSkyExpiry && skyExpiry.getTime() === lastSkyExpiry.getTime()) {
            delayMs = 30 * 60 * 1000;
            console.log(`[Scheduler] Scadenza Sky Cinema Uno invariata (${skyExpiry.toISOString()}), riprovo tra 30 min.`);
        } else {
            const targetMs = skyExpiry.getTime() + 60 * 60 * 1000;
            delayMs = targetMs - now;
            if (delayMs < 300000) delayMs = 300000;
            console.log(`[Scheduler] Nuova scadenza Sky Cinema Uno: ${skyExpiry.toISOString()}, refresh tra ${Math.round(delayMs / 60000)} min.`);
        }
        lastSkyExpiry = skyExpiry;
    } else {
        delayMs = REFRESH_INTERVAL_MIN * 60 * 1000;
        console.log(`[Scheduler] Nessuna scadenza, refresh ogni ${REFRESH_INTERVAL_MIN} min.`);
        lastSkyExpiry = null;
    }

    refreshTimer = setTimeout(() => updateChannels(), delayMs);
}

async function updateChannels() {
    console.log('[Update] Inizio aggiornamento...');
    await buildChannels();

    let uaznaoData = null;
    if (currentUaznaoUrl) {
        try {
            const { data } = await axios.get(currentUaznaoUrl, { timeout: 30000 });
            uaznaoData = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data).find(v => Array.isArray(v)) : null);
        } catch {}
    }
    scheduleNextRefresh(uaznaoData);
}

// ---------- EPG giornaliero (02:00 UTC) ----------
function scheduleEPG() {
    if (!EPG_URL) return;
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0, 0));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    console.log(`[EPG] Prossimo aggiornamento alle ${next.toISOString()}`);
    setTimeout(() => { updateEPG(); scheduleEPG(); }, delay);
}

// ---------- Stremio ----------
let builder, iface;

async function run() {
    await updateEPG();
    await updateChannels();
    scheduleEPG();

    const manifest = {
        id: 'org.iptv.arta', version: '2.3.0', name: 'Arta LiveTV', description: 'Streaming Live TV con DRM',
        resources: ['catalog', 'meta', 'stream'], types: ['tv'],
        catalogs: [{
            type: 'tv', id: 'iptv_live', name: 'Canali TV',
            extra: [
                { name: 'genre', isRequired: false, options: Array.from(genres).sort() },
                { name: 'search', isRequired: false }, { name: 'skip', isRequired: false }
            ]
        }],
        idPrefixes: ['iptv_'], behaviorHints: { configurable: false }, logo: "https://dl.strem.io/addon-logo.png"
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
        let desc = `Categoria: ${ch.genre}`;
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
        console.log(`[Stream] ${ch.name}`);
        return { streams: [{ title: 'Stream in Diretta', url: ch.url, behaviorHints: { notWebReady: true, bingeGroup: "tv" } }] };
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
        return Buffer.from(`<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"><rect fill="#1a1a1a" width="320" height="180"/><text fill="#ffffff" font-family="Arial" font-size="20" x="160" y="90" text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`);
    }
    app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); if (req.method === 'OPTIONS') return res.sendStatus(200); next(); });
    app.get('/manifest.json', (req, res) => { const m = builder.getInterface().manifest; m.catalogs[0].extra[0].options = Array.from(genres).sort(); res.json(m); });
    iface = builder.getInterface();
    app.use('/', getRouter(iface));
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Arta LiveTV sulla porta ${PORT}`));
}

run();
