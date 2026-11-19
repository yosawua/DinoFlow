-- DinoFlow TimescaleDB / PostgreSQL Initialization Schema
-- Modular Hierarchy: Sites -> Zones -> Hydraulic Lines -> Nodes -> Sensors -> Readings

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Try TimescaleDB extension
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB extension could not be loaded; continuing with standard PostgreSQL tables.';
END $$;

-- 2. Sites (Sitio: Casa, Edificio, PyME, Fraccionamiento, Ciudad)
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    site_type VARCHAR(64) DEFAULT 'residencial', -- 'residencial', 'comercial', 'industrial', 'publico'
    cost_per_m3 DOUBLE PRECISION DEFAULT 25.0,     -- Costo de agua en moneda local por m3
    currency VARCHAR(10) DEFAULT 'MXN',
    contact_phone VARCHAR(32),
    contact_email VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Zones (Zona: Jardín, Cocina, Planta Alta, Acometida, Cisterna)
CREATE TABLE IF NOT EXISTS zones (
    id VARCHAR(64) PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    floor_level INT DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hydraulic Lines / Segments (Instalación hidráulica: tubería o tramo entre dos puntos)
CREATE TABLE IF NOT EXISTS hydraulic_lines (
    id VARCHAR(64) PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    zone_id VARCHAR(64) REFERENCES zones(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    material VARCHAR(64) DEFAULT 'CPVC', -- 'CPVC', 'PPR', 'Cobre', 'Galvanizado', 'PEX'
    diameter_inches DOUBLE PRECISION DEFAULT 0.75,
    max_safe_pressure_bar DOUBLE PRECISION DEFAULT 4.5,
    min_safe_pressure_bar DOUBLE PRECISION DEFAULT 0.8,
    inlet_node_id VARCHAR(64),  -- Sensor o nodo aguas arriba
    outlet_node_id VARCHAR(64), -- Sensor o nodo aguas abajo (para balance delta)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Nodes (Dispositivos físicos ESP32 / Gateway)
CREATE TABLE IF NOT EXISTS nodes (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'node-esp32-acometida'
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    zone_id VARCHAR(64) REFERENCES zones(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(32),
    connection_type VARCHAR(32) DEFAULT 'wifi', -- 'wifi', 'ethernet', 'rs485'
    ip_address VARCHAR(45),
    firmware_version VARCHAR(32) DEFAULT '1.0.0',
    status VARCHAR(32) DEFAULT 'online', -- 'online', 'offline', 'warning', 'maintenance'
    auth_token VARCHAR(128),
    battery_powered BOOLEAN DEFAULT FALSE,
    paired_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sensors (Componentes dentro del nodo: YF-S201, Transductor 0.5-4.5V, DS18B20)
CREATE TABLE IF NOT EXISTS sensors (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'sensor-flow-01'
    node_id VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    sensor_type VARCHAR(32) NOT NULL, -- 'flow', 'pressure', 'temperature'
    model VARCHAR(64) NOT NULL,       -- 'YF-S201', 'SEN0257', 'DS18B20'
    pin VARCHAR(16),
    calibration_factor DOUBLE PRECISION DEFAULT 1.0, -- Factor multiplicador (p.ej. pulsos a L/min)
    unit VARCHAR(16) NOT NULL,        -- 'L/min', 'bar', '°C'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sensor Readings (Lecturas telemétricas - Hypertable en TimescaleDB)
CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    zone_id VARCHAR(64) NOT NULL,
    site_id VARCHAR(64) NOT NULL,
    flow_lpm DOUBLE PRECISION,      -- Caudal en Litros por Minuto
    pressure_bar DOUBLE PRECISION,  -- Presión en bares
    temperature_c DOUBLE PRECISION, -- Temperatura en °C
    battery_pct DOUBLE PRECISION,   -- % batería si aplica
    rssi INT,                       -- Intensidad de señal dBm
    flags INT DEFAULT 0             -- Flags binarios de diagnóstico
);

-- Indexación temporal y por entidad
CREATE INDEX IF NOT EXISTS idx_readings_node_time ON sensor_readings(node_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_readings_zone_time ON sensor_readings(zone_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_readings_site_time ON sensor_readings(site_id, time DESC);

-- Convertir en Hypertable en TimescaleDB si está disponible
DO $$
BEGIN
    PERFORM create_hypertable('sensor_readings', 'time', if_not_exists => TRUE, migrate_data => TRUE);
    RAISE NOTICE 'Hypertable sensor_readings initialized successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'create_hypertable skipped or not supported on this engine.';
END $$;

-- 8. Baselines (Línea base aprendida por zona y franja horaria: hora 0 a 23, día 0 a 6)
CREATE TABLE IF NOT EXISTS baselines (
    id SERIAL PRIMARY KEY,
    zone_id VARCHAR(64) NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 6 = Sábado
    hour_of_day INT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    avg_flow_lpm DOUBLE PRECISION DEFAULT 0.0,
    max_expected_flow_lpm DOUBLE PRECISION DEFAULT 15.0,
    min_expected_pressure_bar DOUBLE PRECISION DEFAULT 1.2,
    max_expected_pressure_bar DOUBLE PRECISION DEFAULT 3.5,
    sample_count INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_zone_day_hour UNIQUE (zone_id, day_of_week, hour_of_day)
);

-- 9. Detection Rules (Reglas configurables con umbrales sin tocar código)
CREATE TABLE IF NOT EXISTS detection_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    severity VARCHAR(32) NOT NULL, -- 'normal', 'atencion', 'alerta_temprana', 'urgente'
    is_enabled BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Alerts (Historial de alertas con estado, impacto económico y explicación IA)
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    site_id VARCHAR(64) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    zone_id VARCHAR(64) REFERENCES zones(id) ON DELETE SET NULL,
    node_id VARCHAR(64) REFERENCES nodes(id) ON DELETE SET NULL,
    rule_id VARCHAR(64) REFERENCES detection_rules(id) ON DELETE SET NULL,
    severity VARCHAR(32) NOT NULL, -- 'atencion', 'alerta_temprana', 'urgente'
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    metric_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    unit VARCHAR(32),
    status VARCHAR(32) DEFAULT 'nueva', -- 'nueva', 'vista', 'resuelta'
    ai_explanation TEXT,
    ai_recommendations TEXT,
    estimated_loss_liters DOUBLE PRECISION DEFAULT 0,
    estimated_loss_cost DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_alerts_site_status ON alerts(site_id, status, created_at DESC);

-- 11. Datos Semilla por defecto (Demostración inmediata)
INSERT INTO sites (id, name, address, site_type, cost_per_m3, currency)
VALUES ('site-casa-01', 'Residencia Las Palmas (Demo)', 'Av. Acueducto 1420, Zapopan, Jalisco', 'residencial', 25.50, 'MXN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO zones (id, site_id, name, description, floor_level, is_critical)
VALUES 
    ('zone-acometida', 'site-casa-01', 'Acometida Principal', 'Medidor de calle y válvula reductora', 0, TRUE),
    ('zone-jardin', 'site-casa-01', 'Jardín y Riego Exterior', 'Línea de riego y aspersores', 0, FALSE),
    ('zone-cocina-pb', 'site-casa-01', 'Cocina y Baño PB', 'Alimentación fregadero y medio baño', 0, FALSE),
    ('zone-planta-alta', 'site-casa-01', 'Tinaco y Baños PA', 'Bajada de tinaco hacia regaderas', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hydraulic_lines (id, site_id, zone_id, name, material, diameter_inches, max_safe_pressure_bar, min_safe_pressure_bar, inlet_node_id, outlet_node_id)
VALUES
    ('line-acometida-distribucion', 'site-casa-01', 'zone-acometida', 'Tramo Acometida a Distribuidor', 'PPR', 1.0, 4.5, 1.0, 'node-acometida-01', 'node-cocina-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nodes (id, site_id, zone_id, name, mac_address, connection_type, ip_address, status)
VALUES
    ('node-acometida-01', 'site-casa-01', 'zone-acometida', 'Nodo Sensor Acometida', '24:6F:28:B1:A0:10', 'wifi', '192.168.1.101', 'online'),
    ('node-jardin-01', 'site-casa-01', 'zone-jardin', 'Nodo Sensor Riego', '24:6F:28:B1:A0:11', 'wifi', '192.168.1.102', 'online'),
    ('node-cocina-01', 'site-casa-01', 'zone-cocina-pb', 'Nodo Sensor Cocina', '24:6F:28:B1:A0:12', 'wifi', '192.168.1.103', 'online'),
    ('node-tinaco-01', 'site-casa-01', 'zone-planta-alta', 'Nodo Sensor Tinaco/PA', '24:6F:28:B1:A0:13', 'rs485', '192.168.1.104', 'online')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sensors (id, node_id, sensor_type, model, pin, calibration_factor, unit)
VALUES
    ('sens-flw-01', 'node-acometida-01', 'flow', 'YF-S201', 'GPIO4', 7.5, 'L/min'),
    ('sens-prs-01', 'node-acometida-01', 'pressure', 'SEN0257', 'GPIO34', 1.0, 'bar'),
    ('sens-tmp-01', 'node-acometida-01', 'temperature', 'DS18B20', 'GPIO5', 1.0, '°C'),
    ('sens-flw-02', 'node-cocina-01', 'flow', 'YF-S201', 'GPIO4', 7.5, 'L/min')
ON CONFLICT (id) DO NOTHING;

-- Reglas de Detección Configurables
INSERT INTO detection_rules (id, name, description, severity, config)
VALUES
    ('rule-fuga-nocturna', 'Flujo Continuo en Horario de Reposo', 'Detecta consumo constante entre 01:00 y 05:00 hrs', 'alerta_temprana', '{
        "start_hour": 1,
        "end_hour": 5,
        "min_flow_lpm": 0.25,
        "sustained_minutes": 10,
        "cooldown_minutes": 30
    }'),
    ('rule-caida-presion-ruptura', 'Caída Súbita de Presión (Ruptura)', 'Presión baja con flujo alto repentino', 'urgente', '{
        "min_pressure_bar": 0.5,
        "min_flow_lpm": 25.0,
        "sustained_seconds": 15
    }'),
    ('rule-falta-agua', 'Falta de Suministro / Tinaco Vacío', 'Presión prácticamente cero y flujo nulo', 'atencion', '{
        "max_pressure_bar": 0.15,
        "max_flow_lpm": 0.05,
        "sustained_minutes": 5
    }'),
    ('rule-baja-presion', 'Baja Presión de Red', 'Presión de servicio por debajo del estándar mínimo de confort', 'atencion', '{
        "low_pressure_threshold_bar": 0.8,
        "sustained_minutes": 10
    }'),
    ('rule-fuga-tramo-delta', 'Diferencia de Flujo Entre Nodos (Tramo)', 'Pérdida neta entre sensor de entrada y salida', 'urgente', '{
        "inlet_node_id": "node-acometida-01",
        "outlet_node_id": "node-cocina-01",
        "min_delta_lpm": 1.5,
        "sustained_seconds": 30
    }'),
    ('rule-temperatura-extrema', 'Riesgo de Congelamiento o Sobrecalentamiento', 'Temperatura fuera del rango seguro de operación de tuberías', 'alerta_temprana', '{
        "freeze_threshold_c": 3.0,
        "overheat_threshold_c": 55.0
    }')
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- Sembrar líneas base típicas para la acometida (24 horas)
INSERT INTO baselines (zone_id, day_of_week, hour_of_day, avg_flow_lpm, max_expected_flow_lpm, min_expected_pressure_bar, max_expected_pressure_bar)
SELECT 
    'zone-acometida',
    d,
    h,
    CASE 
        WHEN h BETWEEN 1 AND 5 THEN 0.05
        WHEN h BETWEEN 6 AND 9 THEN 8.5
        WHEN h BETWEEN 12 AND 15 THEN 5.2
        WHEN h BETWEEN 19 AND 22 THEN 7.0
        ELSE 1.5
    END as avg_flow,
    CASE 
        WHEN h BETWEEN 1 AND 5 THEN 0.3
        WHEN h BETWEEN 6 AND 9 THEN 22.0
        WHEN h BETWEEN 12 AND 15 THEN 18.0
        WHEN h BETWEEN 19 AND 22 THEN 20.0
        ELSE 6.0
    END as max_flow,
    1.4 as min_pres,
    3.2 as max_pres
FROM generate_series(0, 6) d
CROSS JOIN generate_series(0, 23) h
ON CONFLICT (zone_id, day_of_week, hour_of_day) DO NOTHING;
