# StreamViX Home Assistant Add-on

[![Home Assistant Add-on](https://img.shields.io/badge/Home%20Assistant-Add--on-41BDF5.svg)](https://www.home-assistant.io/addons/)
![Project Stage][project-stage-shield]
![Project Maintenance][maintenance-shield]

[project-stage-shield]: https://img.shields.io/badge/project%20stage-production%20ready-brightgreen.svg
[maintenance-shield]: https://img.shields.io/maintenance/yes/2025.svg

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armv7 Architecture][armv7-shield]

_A Stremio addon that extracts streaming sources from various Italian sites_

## About

StreamViX is a Stremio addon that provides access to Italian streaming content from various sources including VixSrc, AnimeUnity, AnimeSaturn, and live TV channels. This Home Assistant add-on allows you to run StreamViX directly on your Home Assistant instance.

## Features

- ✅ **Movies Support**: Find streaming sources for movies using TMDB ID
- 📺 **TV Series Support**: Find streams for TV series episodes using TMDB ID
- ⛩️ **Anime Support**: Find anime episodes with support for Cinemeta, TMDB, and Kitsu
- 📡 **Live TV**: Italian TV channels with integrated EPG
- 📡 **Sports Events**: Daily updated sports events
- 🔗 **Seamless Integration**: Perfect integration with Stremio interface
- 🌐 **Unified Proxy**: Single MediaFlow Proxy for all content types
- ⚡ **Dynamic FAST Mode**: Live events with direct URLs without extractor
- 🎯 **Extraction Limits & Priority**: Concurrency caps and priority for Italian sources

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "StreamViX" add-on
3. Configure the add-on options (see Configuration section)
4. Start the add-on
5. Access the web interface at `http://homeassistant.local:7860`

## Configuration

### Basic Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `MFP_URL` | string | - | MediaFlow Proxy URL (optional) |
| `MFP_PSW` | password | - | MediaFlow Proxy password (optional) |
| `TMDB_API_KEY` | string | - | TMDB API key for metadata (optional) |

### Content Sources

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ANIMEUNITY_ENABLED` | boolean | false | Enable AnimeUnity source |
| `ANIMESATURN_ENABLED` | boolean | true | Enable AnimeSaturn source |
| `ENABLE_MPD_STREAMS` | boolean | false | Enable MPD streams (not working, keep false) |
| `ENABLE_LIVE_TV` | boolean | true | Enable Live TV channels |

### Dynamic Content Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `FAST_DYNAMIC` | boolean | false | Enable FAST dynamic mode (direct URLs) |
| `DYNAMIC_EXTRACTOR_CONC` | integer | 10 | Extractor concurrency limit (1-50) |
| `DYNAMIC_PURGE_HOUR` | integer | 8 | Hour to purge old events (0-23) |
| `DYNAMIC_DISABLE_RUNTIME_FILTER` | boolean | true | Disable runtime date filtering |
| `DYNAMIC_KEEP_YESTERDAY` | boolean | false | Keep yesterday's events |

### Example Configuration

```yaml
MFP_URL: "https://your-mediaflow-proxy.example.com"
MFP_PSW: "your-proxy-password"
TMDB_API_KEY: "your-tmdb-api-key"
ANIMEUNITY_ENABLED: true
ANIMESATURN_ENABLED: true
ENABLE_LIVE_TV: true
FAST_DYNAMIC: false
DYNAMIC_EXTRACTOR_CONC: 10
```

## Usage

1. After starting the add-on, access the web interface at `http://homeassistant.local:7860`
2. Configure StreamViX with your MediaFlow Proxy settings (if using)
3. Install the addon in Stremio using the provided manifest URL
4. Enjoy Italian content directly in Stremio!

### Administrative Endpoints

The add-on provides several administrative endpoints:

- `/live/update` - Update live events immediately
- `/live/purge` - Purge old events
- `/live/reload` - Reload catalog without re-running script
- `/admin/mode?fast=1` - Enable FAST dynamic mode
- `/admin/mode?fast=0` - Return to extractor mode

## Operating Modes

### FAST Mode (Direct URLs)
- Activated with `FAST_DYNAMIC=true` or runtime endpoint
- Skips extractor and uses direct URLs from JSON
- No concurrency limits, all sources exposed as direct streams
- All FAST streams labeled with `[Player Esterno]` prefix

### Extractor Mode (Default)
- Each dynamic URL passes through resolution (if MFP configured)
- Applies concurrency cap (`DYNAMIC_EXTRACTOR_CONC`)
- Sources beyond cap exposed as direct leftover streams
- Priority: Italian titles first, then other Italian sources, then others

## Scheduling

The Live.py script runs automatically every 2 hours starting from 08:10 Europe/Rome:
- 08:10, 10:10, 12:10, 14:10, 16:10, 18:10, 20:10, 22:10, 00:10, 02:10, 04:10, 06:10
- Physical purge of old events occurs at 02:05 with safety reload at 02:30

## Support

This add-on is based on the original [StreamViX](https://github.com/qwertyuiop8899/StreamViX) project.

For issues specific to the Home Assistant add-on, please report them in the add-on repository.
For StreamViX-related issues, please refer to the [original repository](https://github.com/qwertyuiop8899/StreamViX).

## Disclaimer

This project is for educational purposes only. Users are solely responsible for their usage. Ensure compliance with copyright laws and terms of service of used sources.

## Credits

- Original StreamViX by [qwertyuiop8899](https://github.com/qwertyuiop8899)
- Extraction logic by [mhdzumair](https://github.com/mhdzumair)
- Main code by [ThEditor](https://github.com/ThEditor)
- Special thanks to @UrloMythus for extractors and Kitsu logic

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
