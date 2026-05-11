--  CarbonTree System — Schema PostgreSQL

DROP TABLE IF EXISTS carbon_credits        CASCADE;
DROP TABLE IF EXISTS alerts                CASCADE;
DROP TABLE IF EXISTS sensor_readings       CASCADE;
DROP TABLE IF EXISTS stations              CASCADE;
DROP TABLE IF EXISTS conformity_parameters CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;

--  USERS
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    full_name VARCHAR(200),
    role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR'
                     CHECK (role IN ('ADMIN','OPERATOR','VIEWER')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

--  STATIONS
CREATE TABLE stations (
    id BIGSERIAL PRIMARY KEY,
    station_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(300),
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE'
                       CHECK (status IN ('ONLINE','OFFLINE','MAINTENANCE')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_seen TIMESTAMP
);
--  SENSOR_READINGS
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    co2_level DOUBLE PRECISION,
    pm_level DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    recorded_at TIMESTAMP NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'MQTT'
                       CHECK (source IN ('MQTT','SIMULATED','MANUAL'))
);

CREATE INDEX idx_sensor_readings_station_time
    ON sensor_readings(station_id, recorded_at DESC);

--  ALERTS
CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL
                     CHECK (type IN ('CO2_HIGH','PM_HIGH','SENSOR_OFFLINE','SYSTEM')),
    severity VARCHAR(10) NOT NULL
                         CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    message TEXT NOT NULL,
    trigger_value DOUBLE PRECISION,
    limit_value DOUBLE PRECISION,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    triggered_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_alerts_station_ack
    ON alerts(station_id, acknowledged, triggered_at DESC);

--  CARBON_CREDITS
CREATE TABLE carbon_credits (
    id BIGSERIAL PRIMARY KEY,
    station_id BIGINT REFERENCES stations(id) ON DELETE SET NULL,
    credits_calculated DOUBLE PRECISION NOT NULL,
    period_reference VARCHAR(50),
    description TEXT,
    calculated_at TIMESTAMP,
    validated BOOLEAN NOT NULL DEFAULT FALSE
);
--  CONFORMITY_PARAMETERS
CREATE TABLE conformity_parameters (
    id BIGSERIAL PRIMARY KEY,
    parameter_name VARCHAR(200) NOT NULL,
    max_co2_level DOUBLE PRECISION,
    max_pm_level DOUBLE PRECISION,
    legal_reference VARCHAR(300),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
--  DADOS INICIAIS

-- Usuário admin (senha: admin123)
INSERT INTO users (username, password, email, full_name, role) VALUES (
    'admin',
   '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6ZEHJ' ,
    'admin@carbontree.com',
    'Administrador',
    'ADMIN'
);

-- Parâmetro de conformidade CONAMA
INSERT INTO conformity_parameters (parameter_name, max_co2_level, max_pm_level, legal_reference, description) VALUES (
    'CONAMA 03/1990',
    1000.0,
    150.0,
    'Resolução CONAMA nº 03, de 28 de junho de 1990',
    'Padrões nacionais de qualidade do ar — padrões primários'
);
--  ESTAÇÕES — ajuste os dados conforme as suas
INSERT INTO stations (station_code, name, location, status, latitude, longitude, last_seen) VALUES
    ('ST-001', 'Estação Norte', 'Setor Norte - Facens',  'ONLINE',  -23.5000, -47.4500, NOW()),
    ('ST-002', 'Refinaria',     'Centro',                'ONLINE',  -23.5100, -47.4600, NOW()),
    ('ST-003', 'Produção',      'Zona Sul',              'OFFLINE', -23.5200, -47.4700, NOW());

--  LEITURAS SIMULADAS — últimas 24h para cada estação
INSERT INTO sensor_readings (station_id, co2_level, pm_level, temperature, humidity, recorded_at, source)
SELECT
    s.id,
    400 + (random() * 400),
    20  + (random() * 30),
    20  + (random() * 10),
    50  + (random() * 30),
    NOW() - (generate_series(0, 23) || ' hours')::interval,
    'SIMULATED'
FROM stations s
WHERE s.station_code IN ('ST-001', 'ST-002', 'ST-003');

UPDATE users SET 
    username = TRIM(username),
    password = TRIM(password),
    role = TRIM(role);