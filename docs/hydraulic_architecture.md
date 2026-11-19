# DinoFlow: Arquitectura Hidráulica Modular y Modelado de Datos

DinoFlow implementa una jerarquía física modular de 5 niveles que permite escalar el sistema sin rediseñar la base de datos: desde una casa unifamiliar, un edificio de departamentos, un fraccionamiento, hasta una red municipal de distribución.

---

## 1. Jerarquía de Entidades

```
[ Sitio (Site) ]
    │   Ej: Residencia Las Palmas / Edificio Torre Diana
    ▼
[ Zona (Zone) ]
    │   Ej: Acometida Principal, Jardín y Riego, Cocina PB, Tinaco Azotea
    ▼
[ Instalación Hidráulica / Tramo (Hydraulic Line) ]
    │   Ej: Tramo Subterráneo Acometida a Cisterna (PPR 1")
    ▼
[ Dispositivo / Nodo Físico (Node ESP32) ]
    │   Ej: node-acometida-01 (WiFi/RS-485, IP, MAC)
    ▼
[ Sensores (Sensors) ]
        ├── Sensor de Caudal (YF-S201 - Pulsos Hall)
        ├── Transductor de Presión (0.5–4.5 V Analógico)
        └── Sensor de Temperatura (DS18B20 1-Wire)
```

---

## 2. Modelos Físicos de Detección de Anomalías

### A. Balance de Masa en Tramo Cerrado (Fuga Oculta)
En una tubería sin consumos intermedios entre un nodo de entrada ($A$) y un nodo de salida ($B$), la ley de conservación de masa establece que:

$$Q_{in} = Q_{out}$$

Si existe una diferencia sostenida superior al umbral de sensibilidad de los caudalímetros:

$$\Delta Q = Q_{in} - Q_{out} \ge \Delta Q_{min} \quad (\text{por ejemplo, } 1.5 \text{ L/min})$$

Durante un período sostenido $t \ge 30 \text{ segundos}$, el sistema concluye matemáticamente la presencia de una **fuga oculta en el tramo** (tubería enterrada o ahogada en muro), sin necesidad de que el agua sea visible en superficie.

---

### B. Correlación Presión - Caudal (Ruptura Mayor)
Cuando una tubería sufre una fractura o reventón franco, la curva de operación del sistema se desplaza hacia un caudal anormalmente alto mientras la presión colapsa (Principio de Bernoulli y curva de resistencia del conducto):

$$P \le 0.6 \text{ bar} \quad \land \quad Q \ge 25.0 \text{ L/min}$$

Esto descarta un grifo abierto normal (el cual mantiene presiones de 1.8 a 2.5 bar) y dispara de inmediato la alerta de **Severidad Urgente**.

---

### C. Fuga Silenciosa / Goteo en Horario de Reposo
En el intervalo horario comprendido entre las 01:00 y las 05:00 horas (cuando la demanda doméstica habitual es nula según la línea base):

$$Q(t) \ge 0.25 \text{ L/min} \quad \forall t \in [01:00, 05:00]$$

Sostenido durante más de 10 minutos, identifica fugas lentas típicas: sapo de inodoro defectuoso, empaque de regadera degradado o microfisuras en uniones.

---

### D. Cálculo del Impacto Hídrico y Financiero
Para cada alerta generada, DinoFlow cuantifica el desperdicio en tiempo real:

$$\text{Volumen Perdido (Litros)} = \bar{Q}_{fuga} \times t_{duracion} \times 60$$

$$\text{Costo Financiero (\$ MXN)} = \left(\frac{\text{Volumen Perdido}}{1000}\right) \times \text{Costo por } m^3$$
