# MediaFlow Proxy Add-on for Home Assistant

[![Home Assistant Add-on](https://img.shields.io/badge/Home%20Assistant-Add--on-41BDF5.svg)](https://www.home-assistant.io/addons/)
![Project Stage][project-stage-shield]
![Project Maintenance][maintenance-shield]

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

[project-stage-shield]: https://img.shields.io/badge/project%20stage-production%20ready-brightgreen.svg
[maintenance-shield]: https://img.shields.io/maintenance/yes/2025.svg
[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg


## About

This add-on packages [MediaFlow Proxy](https://github.com/mhdzumair/mediaflow-proxy) as a Home Assistant add-on, making it easy to install and manage through the Home Assistant interface.

**MediaFlow Proxy** is a high-performance proxy server for streaming media, supporting HTTP(S), HLS, and MPEG-DASH with real-time DRM decryption.

## Installation

1. Find MediaFlow Proxy add-on in the **Add-on Store**
2. Install the "MediaFlow Proxy" add-on
3. Configure the add-on (at minimum set an `api_password`)
4. Start the add-on

## Configuration

### Required
- `api_password`: Password to protect the API
- Default port: **8888** (can be freely changed in the add-on configuration)

### Optional
- `log_level`: Logging level (default: info)
- `enable_streaming_progress`: Enable streaming progress logging
- `disable_home_page`: Disable home page UI
- `proxy_url`: HTTP proxy URL for routing traffic
- `enable_hls_prebuffer`: Enable HLS pre-buffering
- And many more options...

See the [Configuration](https://github.com/mhdzumair/mediaflow-proxy?tab=readme-ov-file#configuration) options in the original repository.

## Usage

Once started, MediaFlow Proxy will be available at:
- Web interface: `http://homeassistant:8888`
- API documentation: `http://homeassistant:8888/docs`

## Documentation

For detailed information about MediaFlow Proxy features, usage examples, and API documentation, please refer to the **[original repository](https://github.com/mhdzumair/mediaflow-proxy)**.

## Credits

- **Original Software**: [MediaFlow Proxy](https://github.com/mhdzumair/mediaflow-proxy) by [mhdzumair](https://github.com/mhdzumair)
- **Home Assistant Add-on**: Community contribution

## License

This add-on packaging is released under the MIT License. The original MediaFlow Proxy software maintains its own license terms.
