const express = require('express');
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const zlib = require('zlib');

// Variabili d'ambiente da run.sh
const M3U_URL = process.env.M3U_URL;
const EPG_URL = process.env.EPG_URL;
const REFRESH_INTERVAL = (parseInt(process.env.REFRESH_INTERVAL_MIN) || 60) * 60 * 1000;
const EASYPROXY_URL = process.env.EASYPROXY_URL?.replace(/\/$/, ''); 
const EASYPROXY_PASSWORD = process.env.EASYPROXY_PASSWORD;
const PORT = process.env.PORT || 3000;

// Stato in memoria
let channels = [];
let genres = new Set();
let epgData = {};

// Funzione helper per scaricare e (se necessario) decomprimere l'EPG
async function downloadEPG(url) {
    const response = await axios.get(url, { 
        responseType: 'arraybuffer', // Scarichiamo in formato binario
        timeout: 30000 
    });
    
    try {
        // Se l'URL finisce in .gz o il server invia header gzip, proviamo a decomprimere
        if (url.endsWith('.gz') || response.headers['content-type']?.includes('gzip')) {
            console.log('[EPG] Rilevato file compresso (gzip). Decompressione in corso...');
            return zlib.gunzipSync(response.data).toString('utf-8');
        }
    } catch (e) {
        console.log('[EPG] Fallita decompressione gzip, procedo considerandolo testo normale.');
    }
    
    // Se non è compresso o la decompressione fallisce, lo convertiamo in testo normale
    return response.data.toString('utf-8');
}

// --- PARSER EPG ---
async function fetchAndParseEPG() {
    if (!EPG_URL) return;
    console.log(`[EPG] Download in corso da: ${EPG_URL}`);
    try {
        const data = await downloadEPG(EPG_URL);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(data);
        epgData = {};
        
        if (result.tv && result.tv.programme) {
            result.tv.programme.forEach(prog => {
                const ch = prog.$.channel;
                if (!epgData[ch]) epgData[ch] = [];
                epgData[ch].push({
                    title: prog.title ? (prog.title[0]._ || prog.title[0]) : 'Programma Sconosciuto',
                    desc: prog.desc ? (prog.desc[0]._ || prog.desc[0]) : ''
                });
            });
        }
        console.log(`[EPG] Completato. Dati trovati per ${Object.keys(epgData).length} canali.`);
    } catch (error) {
        console.error('[EPG] Errore download/parsing EPG:', error.message);
    }
}

// --- PARSER M3U ---
async function fetchAndParseM3U() {
    console.log(`[M3U] Download raw in corso da: ${M3U_URL}`);
    try {
        // M3U è sempre raw text, scarichiamo normalmente
        const { data } = await axios.get(M3U_URL, { timeout: 30000 });
        const lines = data.split('\n');
        
        const newChannels = [];
        const newGenres = new Set();
        let currentChannel = null;

        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('#EXTINF:')) {
                const attrs = {};
                const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
                let m;
                while ((m = attrRegex.exec(cleanLine)) !== null) {
                    attrs[m[1]] = m[2];
                }
                const nameMatch = cleanLine.match(/,(.*)$/);
                const name = nameMatch ? nameMatch[1].trim() : 'Canale Sconosciuto';

                currentChannel = { name, attrs };
            } else if (cleanLine && !cleanLine.startsWith('#') && currentChannel) {
                currentChannel.url = cleanLine;
                
                const groupTitle = currentChannel.attrs['group-title'] || 'Altro';
                newGenres.add(groupTitle);
                
                // ID univoco per Stremio
                const idHash = crypto.createHash('md5').update(currentChannel.url).digest('hex').substring(0, 10);
                
                newChannels.push({
                    id: `iptv_${idHash}`,
                    type: 'tv',
                    name: currentChannel.name,
                    url: currentChannel.url,
                    genre: groupTitle,
                    logo: currentChannel.attrs['tvg-logo'] || `https://via.placeholder.com/300x300/333333/FFFFFF?text=${encodeURIComponent(currentChannel.name)}`,
                    tvgId: currentChannel.attrs['tvg-id'] || null
                });
                currentChannel = null;
            }
        }
        channels = newChannels;
        genres = newGenres;
        console.log(`[M3U] Completato. Estratti ${channels.length} canali e ${genres.size} categorie.`);
    } catch (error) {
        console.error('[M3U] Errore download/parsing M3U:', error.message);
    }
}

// Aggiornamento dati combinato
async function updateData() {
    await fetchAndParseM3U();
    await fetchAndParseEPG();
}

// --- COSTRUZIONE MANIFEST STREMIO ---
function buildManifest() {
    const genreArray = Array.from(genres).sort();
    return {
        id: 'org.iptv.easyproxy',
        version: '1.0.0',
        name: 'HA IPTV Proxy Addon',
        description: 'Live TV con routing tramite EasyProxy.',
        resources: ['catalog', 'meta', 'stream'],
        types: ['tv'],
        catalogs: [
            {
                type: 'tv',
                id: 'iptv_live',
                name: 'Canali TV',
                extra: [
                    { name: 'genre', isRequired: false, options: genreArray },
                    { name: 'search', isRequired: false }
                ]
            }
        ],
        idPrefixes: ['iptv_'],
        behaviorHints: { configurable: false },
        logo: "https://dl.strem.io/addon-logo.png"
    };
}

// --- AVVIO SERVER E STREMIO BUILDER ---
async function startServer() {
    await updateData();
    setInterval(updateData, REFRESH_INTERVAL);

    const manifest = buildManifest();
    const builder = new addonBuilder(manifest);

    // Gestione Catalogo
    builder.defineCatalogHandler(({ type, id, extra }) => {
        if (type !== 'tv' || id !== 'iptv_live') return { metas: [] };

        let filtered = channels;
        if (extra.genre) {
            filtered = filtered.filter(ch => ch.genre === extra.genre);
        }
        if (extra.search) {
            const query = extra.search.toLowerCase();
            filtered = filtered.filter(ch => ch.name.toLowerCase().includes(query));
        }

        const metas = filtered.slice(0, 100).map(ch => ({
            id: ch.id,
            type: 'tv',
            name: ch.name,
            poster: ch.logo,
            posterShape: 'square',
            genres: [ch.genre]
        }));

        return { metas };
    });

    // Gestione Metadati (con EPG)
    builder.defineMetaHandler(({ type, id }) => {
        if (type !== 'tv') return { meta: null };
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: null };

        let description = `Categoria: ${ch.genre}`;
        
        // EPG in tempo reale
        if (ch.tvgId && epgData[ch.tvgId] && epgData[ch.tvgId].length > 0) {
            const currentProg = epgData[ch.tvgId][0];
            description += `\n\n📺 ORA IN ONDA:\n${currentProg.title}`;
            if (currentProg.desc) description += `\n${currentProg.desc}`;
        }

        return {
            meta: {
                id: ch.id,
                type: 'tv',
                name: ch.name,
                poster: ch.logo,
                posterShape: 'square',
                background: ch.logo,
                description: description,
                genres: [ch.genre]
            }
        };
    });

    // Gestione Stream (Routing EasyProxy)
    builder.defineStreamHandler(({ type, id }) => {
        if (type !== 'tv') return { streams: [] };
        const ch = channels.find(c => c.id === id);
        if (!ch) return { streams: [] };

        const encodedUrl = encodeURIComponent(ch.url);
        const proxyUrl = `${EASYPROXY_URL}/live?url=${encodedUrl}&password=${EASYPROXY_PASSWORD}`;

        console.log(`[Stream] Richiesto ${ch.name} -> Reindirizzato a EasyProxy`);

        return {
            streams: [{
                title: 'EasyProxy Stream',
                url: proxyUrl
            }]
        };
    });

    const app = express();
    // Manifest live per i generi aggiornati
    app.get('/manifest.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(buildManifest());
    });

    serveHTTP(builder.getInterface(), { server: app, path: '/manifest.json', port: PORT });
}

if (!M3U_URL || !EASYPROXY_URL) {
    console.error("ERRORE CRITICO: M3U_URL o EASYPROXY_URL non configurati in Home Assistant.");
    process.exit(1);
}

startServer();
