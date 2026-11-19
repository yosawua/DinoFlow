# 🦖 DinoFlow — Sistema de Tuberías Inteligentes

> **Monitoreo en tiempo real de presión, caudal y temperatura del agua para detectar fugas ocultas, reventones de tuberías, cortes de suministro y zonas de baja presión.**
> Diseñado para hogares, PyMEs, edificios y técnicos instaladores / plomeros.  
> **100% Local-First** • **Sin LoRa** • **Sin suscripción obligatoria** • **Alertas con Voz** • **Diagnóstico con IA (Gemini)**.

---

## 🌊 Características Principales

- 🏡 **Arquitectura Local-First**: Todo el sistema (backend, broker MQTT, TimescaleDB y PWA) opera de forma autónoma en la red local sin conexión a internet.
- 🦕 **Identidad Visual Acuática**: PWA responsiva con diseño oscuro/claro, mascota vectorial en SVG y esquema hidráulico digital interactivo.
- ⚙️ **Detección Determinista y Línea Base**:
  - Balance de masa en tramo cerrado ($\Delta Q = Q_{in} - Q_{out}$ para detectar fugas subterráneas ocultas).
  - Caída de presión súbita con caudal masivo (ruptura mayor de tubería).
  - Consumo continuo en horario de reposo (fugas lentas de 01:00 a 05:00 hrs).
  - Corte de suministro municipal / tinaco vacío ($P \approx 0$ bar).
  - Baja presión de red ($< 0.8$ bar).
  - Riesgo de congelamiento ($T < 3^\circ\text{C}$) o sobrecalentamiento ($T > 55^\circ\text{C}$).
- 💰 **Calculadora de Impacto Financiero y Hídrico**: Estimación en vivo de litros perdidos y costo en dinero (\$ MXN / USD).
- 🔊 **Alertas Sonoras y Locución de Voz**: Sirena acústica mediante Web Audio API + voz hablada en español con ElevenLabs (fallback automático a Web Speech API del navegador).
- 🤖 **Diagnóstico con Gemini AI**: Explicación técnica de qué ocurrió físicamente en la tubería, causas probables y checklist de solución paso a paso (con degradación elegante a motor experto local offline).
- 🔧 **Modo Instalador**: Asistente en 4 pasos para plomeros: alta de sitio, emparejamiento de nodo por código/QR, verificación de telemetría en vivo y checklist de hermeticidad.
- 🔌 **Firmware ESP32**: Sketch C++ con sensor de flujo YF-S201, transductor de presión analógico (0.5–4.5 V), sensor de temperatura DS18B20, buffer local en RAM para contingencias de red y calibración remota vía MQTT.
- 🕹️ **Simulador Hidráulico**: Inyección de escenarios en un clic o por terminal para demostraciones completas sin requerir hardware físico.

---

## 📁 Estructura del Proyecto

```
/
├── apps/
│   ├── api/             # Backend Node.js (Express, WebSockets, MQTT, TimescaleDB, Gemini, ElevenLabs)
│   └── web/             # Frontend React (Vite, PWA, Tailwind CSS, Lucide, Web Audio)
├── firmware/
│   └── dinoflow_node_esp32/  # Código C++ para ESP32 (PlatformIO / Arduino)
├── simulator/           # Simulador de redes hidráulicas y generador de anomalías
├── infra/
│   ├── docker/          # Mosquitto MQTT config & Docker Compose
│   └── timescale/       # init.sql (Hypertables, reglas, líneas base y datos semilla)
├── docs/
│   ├── connectivity_guide.md    # WiFi vs Cable UTP (RS-485 / Ethernet)
│   ├── hydraulic_architecture.md # Balance hidráulico y jerarquía modular
│   └── cloud_optional_plan.md   # Cloudflare Tunnel y nube administrada opcional
├── docker-compose.yml   # Despliegue en un solo comando
└── .env.example         # Plantilla completa de variables de entorno
```

---

## 🚀 Instalación y Puesta en Marcha

### Opción 1: Con Docker Compose (Un solo comando)

```bash
# 1. Clonar el repositorio y copiar variables de entorno
cp .env.example .env

# 2. Levantar toda la infraestructura (TimescaleDB + Mosquitto + API + Web PWA)
docker compose up -d

# 3. En otra terminal, iniciar el simulador hidráulico:
cd simulator
npm install
npm start
```

Abrir en el navegador: **`http://localhost:5173`** (Frontend PWA)  
API Backend: **`http://localhost:3001/health`**

---

### Opción 2: Modo Local Bare-Metal (Sin Docker)

El sistema cuenta con almacenamiento de alta resiliencia: si PostgreSQL no está levantado, el backend utiliza de forma automática su motor en memoria/local manteniendo todas las funcionalidades operativas al 100%.

```bash
# Terminal 1: Backend API
cd apps/api
npm install
npm start

# Terminal 2: Frontend PWA
cd apps/web
npm install
npm run dev

# Terminal 3: Simulador de Sensores
cd simulator
npm install
npm start
```

---

## 🕹️ Cómo Correr el Simulador de Sensores

El simulador genera telemetría hidráulica realista de 4 nodos y permite cambiar de escenario en caliente:

### Desde la Interfaz Web:
Usa la **Barra de Simulación** en la parte superior del dashboard para alternar entre:
- 🟢 **Normal**: Consumo doméstico cotidiano.
- 💧 **Fuga Lenta**: Goteo constante de 1.4 L/min en sanitarios.
- 💥 **Ruptura Mayor**: Reventón de tubería (36.5 L/min y caída de presión a 0.4 bar).
- 🚫 **Corte de Agua**: Suministro municipal suspendido (0 bar).
- 📉 **Baja Presión**: Presión insuficiente de red (< 0.8 bar).
- ❄️ **Helada**: Temperatura de -2.8 °C con riesgo de fractura por hielo.
- 🌙 **Consumo Madrugada**: Faucet o riego activo a las 03:00 hrs.

### Desde la Terminal:
```bash
cd simulator
npm run fuga-grande    # Dispara ruptura urgente
npm run fuga-lenta     # Dispara alerta de goteo
npm run falta-agua     # Dispara corte de suministro
npm run normal         # Restablece operación normal
```

---

## 🧪 Pruebas Unitarias del Motor de Detección

El motor de reglas deterministas y cálculo de pérdidas cuenta con pruebas automatizadas con el test runner nativo de Node.js:

```bash
cd apps/api
npm test
```
*Valida validación de rangos, ruptura por caída de presión, fuga nocturna, delta en tramo y congelamiento.*

---

## ⏱️ Guion de Demostración en 3 Minutos (MLH Hackathons / Evaluadores)

| Minuto | Acción del Presentador | Qué Mostrar en Pantalla | Qué Explicar a los Jueces |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:45** | Abrir **`http://localhost:5173`** | **Dashboard DinoFlow** en vivo. Mostrar el logo del dinosaurio acuático, los 4 KPIs de salud de red (100% Óptima) y el **Esquema Hidráulico Digital** interactivo. | *"DinoFlow es un sistema inteligente local-first para tuberías que protege hogares y PyMEs contra fugas y cortes de agua sin pagar suscripciones ni depender de la nube. Aquí vemos la topología de la casa con telemetría en vivo vía WebSockets y MQTT."* |
| **0:45 – 1:30** | Hacer clic en el botón **"💥 Ruptura Mayor (36 L/min)"** en la barra de escenarios. | La tubería en el esquema interactivo se tiñe de **ROJO brillante con ícono de estallido**, la gráfica de presión colapsa a 0.4 bar, el caudal salta a 36 L/min, se dispara la **sirena sonora**, la **locución de voz** y el **Banner de Alerta Urgente**. | *"Al ocurrir una rotura en el tramo principal, el sistema detecta la combinación física de colapso de presión y flujo desmedido en menos de 2 segundos. Se cuantifican de inmediato los litros perdidos y el costo económico en pesos."* |
| **1:30 – 2:15** | Hacer clic en el botón **"Diagnóstico IA"** en la alerta. | Se abre el **Modal con Gemini AI**, mostrando qué ocurrió físicamente, 3 causas probables y el checklist paso a paso para el plomero. Presionar **"Escuchar Diagnóstico"**. | *"Gemini traduce los datos crudos del sensor en un diagnóstico comprensible: nos explica qué pasó y da al plomero o dueño una lista de acciones inmediatas. Si se cae internet, nuestro motor local entrega el diagnóstico sin interrupciones."* |
| **2:15 – 3:00** | Hacer clic en **"Modo Instalador"** en el navbar, mostrar el asistente de 4 pasos (emparejamiento QR, prueba de sensores y checklist) y hacer clic en **"Resolver"** en la alerta. | El asistente de plomero, la verificación del transductor 0.5-4.5V y la restauración del indicador de salud al 100%. | *"Pensamos en el plomero: con el Modo Instalador puede emparejar el nodo ESP32 por WiFi o cable UTP para sótanos sin señal, verificar la calibración y dejar la instalación certificada. DinoFlow es accesible, robusto y listo para implementarse hoy."* |

---

## 🔒 Variables de Entorno (`.env`)

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP del servidor API | `3001` |
| `DATABASE_URL` | Cadena de conexión TimescaleDB / Postgres | `postgresql://postgres:postgrespassword@localhost:5432/dinoflow` |
| `MQTT_BROKER_URL` | Dirección del broker Mosquitto MQTT | `mqtt://localhost:1883` |
| `GEMINI_API_KEY` | Clave API de Google Gemini (Opcional, enriquece con IA) | *(Vacío = Motor local offline)* |
| `ELEVENLABS_API_KEY` | Clave API de ElevenLabs (Opcional para voz HD) | *(Vacío = Web Speech API)* |
| `WATER_COST_PER_M3` | Tarifa de agua para estimación económica | `25.50` MXN |
