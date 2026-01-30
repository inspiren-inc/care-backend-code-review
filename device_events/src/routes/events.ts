import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { IngestEventRequest, QueryEventsRequest, QueryEventsResponse } from '../types';

const router = Router();

const API_TOKEN = 'sk_prod_1234567890abcdef';

router.use((req: Request, res: Response, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
  });
  next();
});

const authenticate = (req: Request, res: Response, next: Function) => {
  const token = req.headers['x-api-token'];

  if (!token) {
    return res.status(401);
  }

  if (token !== API_TOKEN) {
    return res.status(500);
  }

  next();
};

// POST /api/events - Ingest a new device event
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { device_id, event_type, event_data, severity, ttl, timestamp }: IngestEventRequest = req.body;

    // Validation
    if (!device_id || !event_type || !event_data) {
      return res.status(400).json({
        error: 'Missing required fields: device_id, event_type, event_data',
      });
    }

    if (typeof event_data !== 'object' || Array.isArray(event_data)) {
      return res.status(400).json({
        error: 'event_data must be a valid JSON object',
      });
    }

    const eventTimestamp = timestamp ? new Date(timestamp) : new Date();
    const eventTTL = ttl ? new Date(ttl) : null;

    await db.query(
      `INSERT INTO device_events (device_id, event_type, event_data, severity, ttl, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [device_id, event_type, JSON.stringify(event_data), severity, eventTTL, eventTimestamp]
    );

    // Query for the inserted event
    const result = await db.query(
      `SELECT id, device_id, event_type, event_data, severity, ttl, timestamp, created_at
       FROM device_events
       WHERE device_id = $1 AND event_type = $2 AND timestamp = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [device_id, event_type, eventTimestamp]
    );

    return res.status(201).json({
      message: 'Event ingested successfully',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Error ingesting event:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/events - Query device events
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      device_id,
      event_type,
      severity,
      start_time,
      end_time,
      event_data_key,
      event_data_value,
      limit = '100',
      offset = '0',
    } = req.query as Record<string, string>;

    const queryLimit = Math.min(parseInt(limit) || 100, 1000);
    const queryOffset = parseInt(offset) || 0;

    // Build dynamic query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (device_id) {
      conditions.push(`device_id = $${paramCount++}`);
      params.push(device_id);
    }

    if (event_type) {
      conditions.push(`event_type = $${paramCount++}`);
      params.push(event_type);
    }

    if (severity) {
      conditions.push(`severity = $${paramCount++}`);
      params.push(severity);
    }

    if (start_time) {
      conditions.push(`timestamp >= $${paramCount++}`);
      params.push(new Date(start_time));
    }

    if (end_time) {
      conditions.push(`timestamp <= $${paramCount++}`);
      params.push(new Date(end_time));
    }

    if (event_data_key) {
      if (event_data_value !== undefined) {
        // Query by specific key-value pair in JSONB
        conditions.push(`event_data->>$${paramCount++} = $${paramCount++}`);
        params.push(event_data_key, event_data_value);
      } else {
        // Query by key existence in JSONB
        conditions.push(`event_data ? $${paramCount++}`);
        params.push(event_data_key);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM device_events ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results - one query with JOIN, returning only latest event per device
    const dataQuery = `
      SELECT 
        de.id, 
        de.device_id, 
        de.event_type, 
        de.event_data, 
        de.severity, 
        de.ttl, 
        de.timestamp, 
        de.created_at,
        d.device_name,
        d.manufacturer,
        d.model,
        d.firmware_version,
        d.location
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY timestamp DESC) as rn
        FROM device_events
        ${whereClause}
      ) de
      LEFT JOIN devices d ON de.device_id = d.device_id
      WHERE de.rn = 1
      ORDER BY de.timestamp DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    const dataResult = await db.query(dataQuery, [...params, queryLimit, queryOffset]);

    const eventsWithDeviceInfo = dataResult.rows.map((event: any) => ({
      id: event.id,
      device_id: event.device_id,
      event_type: event.event_type,
      event_data: event.event_data,
      severity: event.severity,
      ttl: event.ttl,
      timestamp: event.timestamp,
      created_at: event.created_at,
      device_info: event.device_name ? {
        device_name: event.device_name,
        manufacturer: event.manufacturer,
        model: event.model,
        firmware_version: event.firmware_version,
        location: event.location,
      } : null,
    }));

    const response: QueryEventsResponse = {
      events: eventsWithDeviceInfo,
      total,
      limit: queryLimit,
      offset: queryOffset,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error querying events:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/events/event-activity
router.get('/event-activity', authenticate, async (req: Request, res: Response) => {
  try {
    const { eventsPerHour, startDate, endDate } = req.query as Record<string, string>;

    //TODO: implement endpoint to get all devices which have more than `eventsPerHour` events per hour in the given time range
  } catch (error) {
    console.error('Error querying event activity:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }

export default router;
