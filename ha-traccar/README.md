# Home Assistant Add-on: Traccar Server

This add-on runs **Traccar** (the modern GPS tracking platform) within Home Assistant, utilizing the **official Alpine Linux Docker image**.

It is designed to be lightweight, stable, and completely decoupled from Home Assistant Core updates.

## 📋 Prerequisites

This add-on **requires an external database**. It does not include an embedded database to ensure data persistence and performance.

We highly recommend using the official **MariaDB** add-on for Home Assistant.

### 1. Prepare MariaDB

Before installing Traccar, you **must** configure a database and user in MariaDB.

#### Step 1: Create Database and User

Go to the **MariaDB** add-on configuration and add the following to your configuration:
```yaml
databases:
  - traccar

logins:
  - username: traccar
    password: YOUR_SECURE_PASSWORD
```

#### Step 2: Grant Permissions

After creating the database and user, go to the **MariaDB Web UI** (or use a MySQL client) and grant the necessary permissions:

1. Open the MariaDB add-on web interface
2. Navigate to the **Rights** section
3. Grant permissions to user `traccar` on database `traccar`:
```sql
GRANT ALL PRIVILEGES ON traccar.* TO 'traccar'@'%';
FLUSH PRIVILEGES;
```

> **Note:** The `@'%'` is mandatory because the Traccar container connects from a separate internal Docker IP, not localhost.

**Restart the MariaDB add-on** after applying these changes.

## 💾 Installation

1. Navigate to **Settings** > **Add-ons** > **Add-on Store**.
2. Click the dots (top-right) > **Repositories**.
3. Add the URL of this repository:
```
   https://github.com/dartanidi/ha-addons
```
4. Refresh the page. You should now see **Traccar Server** in the list.
5. Click **Install**.

## ⚙️ Configuration

Before starting the add-on, go to the **Configuration** tab.

| Option | Description | Default |
| :--- | :--- | :--- |
| `web_port` | Web interface port | `8082` |
| `database_driver` | Database driver (leave as default for MariaDB) | `com.mysql.cj.jdbc.Driver` |
| `database_url` | Database connection URL | `jdbc:mysql://core-mariadb:3306/traccar?...` |
| `database_user` | Database username | `traccar` |
| `database_password` | **REQUIRED:** Database password | `cambiami_con_password_db` |

## 🌐 Accessing Traccar

After starting the add-on, access the web interface at:
```
http://YOUR_HOME_ASSISTANT_IP:8082
```

## 📍 GPS Protocols & Ports

This add-on uses **`host_network: true`**, which means all ports are directly accessible on your Home Assistant host.

### Default Port: 5055

Out of the box, **only port 5055 (OsmAnd protocol) is enabled** to minimize resource usage on low-power devices.

* **Use for:** Official Traccar Client (Android/iOS) and OsmAnd protocol.

### Enabling Other Trackers (Hardware Devices)

The add-on supports ports **5000-5150** for various GPS tracker protocols, but most are disabled by default to save memory.

**You do not need to rebuild the add-on.** The configuration file is fully editable directly from Home Assistant.

#### To enable specific hardware protocols (e.g., Teltonika, TK103):

1. **Start the add-on** at least once. This will generate the configuration file.
2. Use the **File Editor** or **Samba Share** add-on to access your Home Assistant file system.
3. Navigate to: `/addon_configs/local_traccar/`
4. Open the `traccar.xml` file.
5. Find the line corresponding to your device and **uncomment** it:
```xml
   <!-- Uncomment to enable Teltonika -->
   <entry key='teltonika.port'>5027</entry>
```

6. **Save** the file.
7. **Restart** the Traccar add-on to apply the changes.

### Supported Protocols

Traccar supports over 200 GPS tracking protocols. Check the [official documentation](https://www.traccar.org/devices/) for your specific device.

## 🔧 Advanced Configuration

### Custom Web Port

If port 8082 conflicts with another service, you can change it in the add-on configuration:
```yaml
web_port: 9090
```

After changing the port, restart the add-on and access Traccar at the new port.

### External Database

If you want to use an external MySQL/MariaDB server instead of the Home Assistant add-on, modify the `database_url`:
```yaml
database_url: "jdbc:mysql://YOUR_EXTERNAL_HOST:3306/traccar?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=UTC&allowMultiQueries=true&autoReconnect=true"
```

## 🔨 Troubleshooting

### "Connection refused" or Database errors

* Ensure you've granted **ALL PRIVILEGES** on the `traccar` database to the `traccar` user
* Verify the password matches exactly in both MariaDB and Traccar configuration
* Check if MariaDB is fully started and healthy before starting Traccar
* Check the Traccar add-on logs for detailed error messages

### Cannot access web interface

* Verify the add-on is running (check logs)
* Ensure port 8082 (or your custom port) is not blocked by a firewall
* Try accessing via: `http://homeassistant.local:8082`

### GPS device not connecting

* Verify you've uncommented the correct protocol in `traccar.xml`
* Check that your device is configured to send data to the correct port
* Restart the Traccar add-on after modifying the configuration
* Check Traccar logs for connection attempts

### Map not loading / White screen

* Traccar uses a modern web interface. Try clearing your browser cache
* Open the browser console (F12) to check for errors
* Ensure you're using a modern browser (Chrome, Firefox, Edge, Safari)

## 📁 Configuration File Location

The editable configuration file is located at:
```
/addon_configs/local_traccar/traccar.xml
```

This file persists across add-on updates and restarts. You can freely modify it to customize Traccar's behavior.

## 🔄 Updates

This add-on uses the official Traccar Docker image. To update Traccar:

1. Check for add-on updates in Home Assistant
2. Update the add-on when a new version is available
3. Your configuration and database will be preserved

## 📚 Resources

* **Official Traccar Documentation:** https://www.traccar.org/documentation/
* **Traccar Device List:** https://www.traccar.org/devices/
* **Traccar Client Apps:** https://www.traccar.org/client/
* **Issue Tracker:** https://github.com/dartanidi/ha-addons/issues

## 📝 License

This add-on wraps the official Traccar software. Traccar is licensed under Apache License 2.0.

---

**Made with ❤️ for Home Assistant**
