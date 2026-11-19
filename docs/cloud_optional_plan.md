# DinoFlow: Plan Nube Opcional y Conectividad Híbrida

DinoFlow está diseñado bajo el principio fundamental **Local-First**: el sistema funciona al 100% en la red de área local (LAN) sin requerir internet ni servicios en la nube.

Sin embargo, para usuarios, empresas o técnicos que deseen supervisar sus instalaciones de forma remota desde cualquier parte del mundo sin comprometer su privacidad ni pagar suscripciones obligatorias, se documentan las siguientes dos vías:

---

## 1. Opción Gratuita y Autónoma: Cloudflare Tunnel (Zero Trust)

Permite exponer de forma segura el frontend PWA y la API de DinoFlow sin abrir puertos en el módem (sin Port Forwarding, sin IP pública estática y sin riesgo de escaneos de puertos).

### Arquitectura de Conexión:

```
[ PWA Móvil Remota / Técnico ]
             |  HTTPS
     [ Cloudflare Edge ]
             |  Túnel Seguro Cifrado (cloudflared)
[ DinoFlow Mini PC / Raspberry Pi Local ]
     ├── Web PWA (Puerto 5173 / 80)
     ├── API & WebSocket (Puerto 3001)
     ├── Mosquitto MQTT (Puerto 1883)
     └── TimescaleDB (Puerto 5432)
```

### Configuración en 3 Pasos (Gratis):

1. **Instalar `cloudflared` en el mini servidor local**:
   ```bash
   # En Linux / Raspberry Pi OS:
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. **Crear el túnel cifrado hacia el servidor DinoFlow**:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create dinoflow-casa
   ```

3. **Configurar el archivo `~/.cloudflared/config.yml`**:
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

   ingress:
     # PWA y Dashboard
     - hostname: agua.midominio.com
       service: http://localhost:5173
     # API Backend y WebSockets
     - hostname: api-agua.midominio.com
       service: http://localhost:3001
     - service: http_status:404
   ```

4. **Levantar el servicio continuo**:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```
*Resultado: Acceso global cifrado con certificado SSL automático, sin costo recurrente.*

---

## 2. Modelo Administrado Opcional (SaaS para PyMEs y Administradores de Edificios)

Para administradores de condominios, cadenas de hoteles o empresas que no deseen operar su propio mini servidor, DinoFlow soporta una arquitectura multi-tenant:

1. **Base de Datos Gestionada**: Compatible directamente con **Tiger Cloud / Timescale Cloud**:
   Basta con cambiar la variable `DATABASE_URL` en el archivo `.env`:
   ```bash
   DATABASE_URL=postgresql://tsdbadmin:password@host.tsdb.cloud.timescale.com:33421/tsdb?sslmode=require
   ```
2. **Broker MQTT Administrado**: Conexión hacia AWS IoT Core, HiveMQ Cloud o EMQX Cloud con certificados TLS mutuos (`mTLS`).
3. **Monetización Opcional sin Bloquear el Núcleo**:
   - Software de código abierto / local-first libre para propietarios y plomeros.
   - Cobro opcional por: almacenamiento histórico ilimitado (> 1 año), analítica predictiva de consumo con IA y reportes automáticos vía WhatsApp/Telegram.
