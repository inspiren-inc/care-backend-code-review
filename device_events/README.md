# Device Events Service

A TypeScript-based Express.js service for ingesting and querying device events with PostgreSQL (RDS-compatible) backend storage.

## Overview

This service provides three main APIs:
1. **Ingest API** - Submit new device events with severity and TTL
2. **Query API** - Retrieve device events with filtering and pagination
3. **Update API** - Update event severity and expiration

**Authentication:** All API endpoints require an API token via the `x-api-token` header.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local PostgreSQL)

## Local Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local PostgreSQL Database

```bash
docker-compose up -d
```

This will start a PostgreSQL database on `localhost:5432` with:
- Database: `device_events`
- User: `postgres`
- Password: `postgres`

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

The default values will work for local development.

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This creates the `device_events` table with appropriate indexes.

### 5. Start the Service

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The service will start on `http://localhost:3000`

## API Documentation

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

### 1. Ingest Device Event

Submit a new device event to the system.

**Endpoint:** `POST /api/events`

**Headers:**
```
x-api-token: <your-api-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "device_id": "device-123",
  "event_type": "temperature_reading",
  "event_data": {
    "temperature": 72.5,
    "unit": "fahrenheit",
    "location": "warehouse-a"
  },
  "severity": "high",
  "ttl": "2025-12-31T23:59:59Z",
  "timestamp": "2025-10-22T12:00:00Z"
}
```

**Fields:**
- `device_id` (required): Unique identifier for the device
- `event_type` (required): Type of event (e.g., "temperature_reading", "motion_detected")
- `event_data` (required): JSON object containing event-specific data
- `severity` (optional): Event severity level (free text)
- `ttl` (optional): Time-to-live - when the event should expire
- `timestamp` (optional): Event timestamp (defaults to current time)

**Response (201 Created):**
```json
{
  "message": "Event ingested successfully",
  "event": {
    "id": 1,
    "device_id": "device-123",
    "event_type": "temperature_reading",
    "event_data": {
      "temperature": 72.5,
      "unit": "fahrenheit",
      "location": "warehouse-a"
    },
    "severity": "high",
    "ttl": "2025-12-31T23:59:59.000Z",
    "timestamp": "2025-10-22T12:00:00.000Z",
    "created_at": "2025-10-22T12:00:01.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid API token
- `400 Bad Request` - Missing required fields or invalid data
- `500 Internal Server Error` - Server error

### 2. Query Device Events

Retrieve device events with optional filtering and pagination.

**Endpoint:** `GET /api/events`

**Headers:**
```
x-api-token: <your-api-token>
```

**Query Parameters:**
- `device_id` (optional): Filter by specific device
- `event_type` (optional): Filter by event type
- `severity` (optional): Filter by severity level
- `start_time` (optional): Filter events after this timestamp (ISO 8601)
- `end_time` (optional): Filter events before this timestamp (ISO 8601)
- `limit` (optional): Number of results per page (default: 100, max: 1000)
- `offset` (optional): Number of results to skip (default: 0)

**Example Requests:**

```bash
# Get all events for a specific device
GET /api/events?device_id=device-123

# Get events by type within a time range
GET /api/events?event_type=temperature_reading&start_time=2025-10-22T00:00:00Z&end_time=2025-10-22T23:59:59Z

# Get high severity events
GET /api/events?severity=high

# Paginated results
GET /api/events?limit=50&offset=100
```

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": 1,
      "device_id": "device-123",
      "event_type": "temperature_reading",
      "event_data": {
        "temperature": 72.5,
        "unit": "fahrenheit",
        "location": "warehouse-a"
      },
      "severity": "high",
      "ttl": "2025-12-31T23:59:59.000Z",
      "timestamp": "2025-10-22T12:00:00.000Z",
      "created_at": "2025-10-22T12:00:01.000Z",
      "metadata": {
        "device_id": "device-123",
        "event_type": "temperature_reading"
      }
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

## Testing with curl

### Ingest an Event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-token: sk_prod_1234567890abcdef" \
  -d '{
    "device_id": "sensor-001",
    "event_type": "temperature_reading",
    "event_data": {
      "temperature": 68.2,
      "humidity": 45,
      "unit": "fahrenheit"
    },
    "severity": "medium",
    "ttl": "2025-12-31T23:59:59Z"
  }'
```

### Query Events
```bash
# Get all events
curl -H "x-api-token: sk_prod_1234567890abcdef" \
  http://localhost:3000/api/events

# Get events for a specific device
curl -H "x-api-token: sk_prod_1234567890abcdef" \
  "http://localhost:3000/api/events?device_id=sensor-001"

# Get high severity events
curl -H "x-api-token: sk_prod_1234567890abcdef" \
  "http://localhost:3000/api/events?severity=high"

# Get events with pagination
curl -H "x-api-token: sk_prod_1234567890abcdef" \
  "http://localhost:3000/api/events?limit=10&offset=0"
```

## Database Schema

### device_events Table

| Column      | Type                     | Description                          |
|-------------|--------------------------|--------------------------------------|
| id          | SERIAL (PRIMARY KEY)     | Auto-incrementing event ID           |
| device_id   | VARCHAR(255)             | Device identifier                    |
| event_type  | VARCHAR(100)             | Type of event                        |
| event_data  | JSONB                    | Event payload (flexible JSON)        |
| severity    | TEXT                     | Event severity level (free text)     |
| ttl         | TIMESTAMP WITH TIME ZONE | Event expiration timestamp           |
| timestamp   | TIMESTAMP WITH TIME ZONE | Event occurrence time                |
| created_at  | TIMESTAMP WITH TIME ZONE | Record creation time                 |

**Indexes:**
- `idx_device_events_device_id` - For device-specific queries
- `idx_device_events_event_type` - For event type filtering
- `idx_device_events_timestamp` - For time-based queries
- `idx_device_events_device_timestamp` - For device + time queries

## Stopping the Service

### Stop the Express server
Press `Ctrl+C` in the terminal where the service is running.

### Stop the PostgreSQL database
```bash
docker-compose down
```

### Remove database data (if needed)
```bash
docker-compose down -v
```

## Authentication

All API endpoints require authentication using an API token.

**Header:** `x-api-token: <your-api-token>`

For local development and testing, use the token: `sk_prod_1234567890abcdef`

## Architecture Notes

- **Express.js** - Lightweight web framework
- **TypeScript** - Type safety and better developer experience
- **PostgreSQL** - RDS-compatible relational database with JSONB support
- **pg** - Non-blocking PostgreSQL client for Node.js
- **JSONB** - Flexible event storage without rigid schema requirements

---

## Code Review Exercise


**Goal:** Review the code and identify security vulnerabilities, performance issues, data validation problems, and API design concerns.

