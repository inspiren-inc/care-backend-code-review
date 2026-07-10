-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(255) PRIMARY KEY,
    device_name VARCHAR(255),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    firmware_version VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Device Events Table
CREATE TABLE IF NOT EXISTS device_events (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    severity TEXT,
    ttl TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_device_events_device_id ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_event_type ON device_events(event_type);
CREATE INDEX IF NOT EXISTS idx_device_events_timestamp ON device_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_device_events_device_timestamp ON device_events(device_id, timestamp DESC);
