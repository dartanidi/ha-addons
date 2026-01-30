# Home Assistant Add-on: Traccar (Official Docker Based)

This add-on runs **Traccar** (the modern GPS tracking platform) within Home Assistant, utilizing the **official Alpine Linux Docker image**.

It is designed to be lightweight, stable, and completely decoupled from Home Assistant Core updates.

## 📋 Prerequisites

This add-on **requires an external database**. It does not include an embedded database to ensure data persistence and performance.

We highly recommend using the official **MariaDB** add-on for Home Assistant.

### 1. Prepare MariaDB

Before installing Traccar, you **must** configure a database and user in MariaDB.
Go to the **MariaDB** add-on configuration and add the following to your `logins` list (merge it with your existing config):

```yaml
databases:
  - traccar
logins:
  - username: traccar
    password: YOUR_SECURE_PASSWORD
    host: "%"
```
> **Note:** `host: "%"` is mandatory because the Traccar container connects from a separate internal Docker IP, not localhost.

**Restart the MariaDB add-on** after applying these changes.

## 💾 Installation

1. Navigate to **Settings** > **Add-ons** > **Add-on Store**.
2. Click the dots (top-right) > **Repositories**.
3. Add the URL of this repository:
   `https://github.com/dartanidi/ha-addons`
4. Refresh the page. You should now see **Traccar Official** in the list.
5. Click **Install**.

## ⚙️ Configuration

Before starting the add-on, go to the **Configuration** tab.

| Option | Description |
| :--- | :--- |
| `database_driver` | Leave as default (`com.mysql.cj.jdbc.Driver`) for MariaDB. |
| `database_url` | Default connects to `core-mariadb`. Change only if using an external server. |
| `database_user` | The username defined in MariaDB (default: `traccar`). |
| `database_password` | **REQUIRED:** The password you set in the MariaDB config. |

## 📍 GPS Protocols & Ports

To minimize resource usage on low-power devices (like Raspberry Pi), this add-on is optimized to open specific ports only when needed.

### Default Port: 5055
Out of the box, **only port 5055 is configured**.
* **Use for:** Official Traccar Client (Android/iOS) and OsmAnd protocol.

### Enabling Other Trackers (Hardware Devices)
The add-on docker container maps the port range `5000-5150` to the host, but the internal Traccar configuration disables unused protocols by default to save memory.

To enable specific hardware protocols (e.g., Teltonika, TK103):

1. You must edit the `traccar/traccar.template.xml` file in this repository (if you have local access) or fork the repo.
2. Uncomment the specific entry for your device.

**Change this:**
```xml
**To this:**
```xml
<entry key='teltonika.port'>5027</entry>

3. Rebuild/Reinstall the add-on.

## 🔨 Troubleshooting

**"Connection refused" or Database errors:**
* Ensure `host: "%"` is set in MariaDB configuration.
* Ensure the password matches exactly.
* Check if MariaDB is fully started/healthy before starting Traccar.

**Map not loading / White screen:**
* Traccar uses a modern web interface. Try clearing your browser cache.
* Open the browser console (F12) to check for mixed-content errors if accessing via HTTPS.

## 📚 Support

* **Official Traccar Documentation:** https://www.traccar.org/documentation/
* **Issue Tracker:** Please report add-on specific issues in this GitHub repository.
