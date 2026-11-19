# DinoFlow: Guía de Conectividad de Nodos IoT (Sin LoRa)

En cumplimiento de los principios no negociables de DinoFlow (**Local-First**, **Sin dependencias de suscripción** y **Sin LoRa**), los nodos de sensado utilizan dos arquitecturas físicas principales según la topología del inmueble:

---

## 1. Comparativa: WiFi vs Cable UTP (RS-485 / Ethernet)

| Criterio | Opción A: WiFi 802.11 b/g/n (ESP32) | Opción B: Cable UTP (RS-485 diferencial) | Opción C: Ethernet Cableada (W5500 / LAN8720) |
| :--- | :--- | :--- | :--- |
| **Medio físico** | Inalámbrico 2.4 GHz | Par trenzado UTP (2 hilos A/B + masa) | Cable UTP Cat5e/Cat6 (RJ-45) |
| **Alcance máximo** | 15 a 35 metros con muros | **Hasta 1,200 metros** en bus lineal | 100 metros por segmento |
| **Inmunidad a ruido** | Media (afectada por concreto y agua) | **Máxima** (señalización diferencial balanceada) | Muy alta (aislamiento galvánico por transformador) |
| **Costo por nodo** | $0 extra (incorporado en ESP32) | +$1.20 USD (módulo transceptor MAX485/SN65HVD72) | +$3.50 USD (módulo SPI W5500) |
| **Alimentación** | Fuente 5V local o batería | **PoE pasivo / bus compartido** (alimentación por el mismo cable) | PoE 802.3af o inyector pasivo |
| **Protocolo de capa superior** | MQTT / HTTP sobre TCP/IP nativo | Modbus RTU / DinoBus Serie binario hacia Gateway | MQTT / HTTP sobre TCP/IP nativo |

---

## 2. ¿Cuándo usar cada opción?

### Usa WiFi cuando:
1. **Casas unifamiliares y departamentos**: La distancia al router o repetidor es inferior a 25 metros.
2. **Instalaciones existentes sin ductos**: Evita ranurar muros o tender canalizaciones visibles en remodelaciones habitadas.
3. **Puntos de consumo accesibles**: Cocina, medio baño, lavandería o jardín con cobertura de red doméstica.

### Usa Cable UTP con RS-485 cuando:
1. **Zonas sin señal ni cobertura inalámbrica**:
   - Sótanos, cisternas subterráneas de concreto armado (jaula de Faraday).
   - Cuartos de máquinas hidroneumáticas con fuerte interferencia electromagnética de motores.
   - Ductos técnicos verticales en edificios de varios pisos.
2. **Fraccionamientos y naves industriales**: Distancias entre la acometida exterior y el centro de control superiores a 50 metros.
3. **Alimentación centralizada**: Permite enviar 12V DC por los pares libres del UTP (pines 4-5 y 7-8) para energizar los sensores sin requerir un enchufe de 127V en cada pozo o registro.

---

## 3. Diagrama de Conexión Eléctrica (RS-485)

```
[ ESP32 Master / Mini PC Gateway ]
          |  (UART Serial: TX2/RX2)
   [ MAX485 Transceiver ]
          |
   Cable UTP (Par Azul/Blanco-Azul)
          |=========================================== Bus RS-485 (Hasta 1.2 km)
          |                                          |
   [ MAX485 Transceiver ]                     [ MAX485 Transceiver ]
          |                                          |
   [ ESP32 Nodo Cisterna ]                    [ ESP32 Nodo Tinaco Azotea ]
     - YF-S201 (Pulsos)                         - YF-S201 (Pulsos)
     - Presión 0.5-4.5V                         - Presión 0.5-4.5V
     - DS18B20 Temp                             - DS18B20 Temp
```

### Configuración del Bus RS-485:
- **Resistencia de terminación**: Colocar una resistencia de **120 Ω** de 1/4W en los dos extremos físicos del bus (entre líneas A y B).
- **Polarización de reposo (Fail-safe biasing)**: Resistencia pull-up de 560 Ω en línea A y pull-down de 560 Ω en línea B en el nodo maestro para evitar lecturas flotantes cuando el bus está en reposo.
