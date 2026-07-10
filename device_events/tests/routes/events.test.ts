import request from 'supertest';
import express from 'express';
import eventsRouter from '../../src/routes/events';
import { db } from '../../src/db/client';

// Mock the database client
jest.mock('../../src/db/client', () => ({
  db: {
    query: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

// API token for testing
const API_TOKEN = 'sk_prod_1234567890abcdef';

describe('Events Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/events', () => {
    it('should create a new event successfully', async () => {
      const mockEvent = {
        id: 1,
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: new Date('2023-01-01T00:00:00Z'),
        created_at: new Date('2023-01-01T00:00:00Z'),
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockEvent],
      });

      const eventData = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: '2023-01-01T00:00:00Z',
      };

      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send(eventData)
        .expect(201);

      expect(response.body.message).toBe('Event ingested successfully');
      expect(response.body.event.device_id).toBe('device123');
      expect(response.body.event.event_type).toBe('click');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO device_events'),
        expect.arrayContaining(['device123', 'click', '{"button":"submit"}'])
      );
    });

    it('should create event with current timestamp when not provided', async () => {
      const mockEvent = {
        id: 1,
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: expect.any(Date),
        created_at: expect.any(Date),
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockEvent],
      });

      const eventData = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
      };

      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send(eventData)
        .expect(201);

      expect(response.body.message).toBe('Event ingested successfully');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO device_events'),
        expect.arrayContaining(['device123', 'click', '{"button":"submit"}'])
      );
    });

    it('should return 401 for missing API token', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
        })
        .expect(401);

      expect(response.body.error).toBe('Missing API token');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send({
          device_id: 'device123',
          // missing event_type and event_data
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: device_id, event_type, event_data');
    });

    it('should return 400 for invalid event_data type', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send({
          device_id: 'device123',
          event_type: 'click',
          event_data: 'invalid', // should be object
        })
        .expect(400);

      expect(response.body.error).toBe('event_data must be a valid JSON object');
    });

    it('should return 400 for array event_data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send({
          device_id: 'device123',
          event_type: 'click',
          event_data: ['invalid'], // should be object, not array
        })
        .expect(400);

      expect(response.body.error).toBe('event_data must be a valid JSON object');
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const eventData = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
      };

      const response = await request(app)
        .post('/api/events')
        .set('x-api-token', API_TOKEN)
        .send(eventData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/events', () => {
    it('should return events with default pagination', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockEvents }) // data query
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] }); // N+1 query

      const response = await request(app)
        .get('/api/events')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(response.body.events[0].metadata).toBeDefined();
      expect(response.body.total).toBe(1);
      expect(response.body.limit).toBe(100);
      expect(response.body.offset).toBe(0);
    });

    it('should filter by device_id', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] });

      await request(app)
        .get('/api/events?device_id=device123')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE device_id = $1'),
        ['device123']
      );
    });

    it('should filter by event_type', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] });

      await request(app)
        .get('/api/events?event_type=click')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE event_type = $1'),
        ['click']
      );
    });

    it('should filter by time range', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] });

      await request(app)
        .get('/api/events?start_time=2023-01-01T00:00:00Z&end_time=2023-01-02T00:00:00Z')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timestamp >= $1 AND timestamp <= $2'),
        [new Date('2023-01-01T00:00:00Z'), new Date('2023-01-02T00:00:00Z')]
      );
    });

    it('should handle custom pagination', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] });

      const response = await request(app)
        .get('/api/events?limit=50&offset=10')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.limit).toBe(50);
      expect(response.body.offset).toBe(10);
    });

    it('should limit maximum page size to 1000', async () => {
      const mockEvents = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [{ device_id: 'device123', event_type: 'click' }] });

      const response = await request(app)
        .get('/api/events?limit=2000')
        .set('x-api-token', API_TOKEN)
        .expect(200);

      expect(response.body.limit).toBe(1000);
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/events')
        .set('x-api-token', API_TOKEN)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });
});

