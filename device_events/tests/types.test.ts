import {
  DeviceEvent,
  IngestEventRequest,
  QueryEventsRequest,
  QueryEventsResponse,
} from '../src/types';

describe('Type Definitions', () => {
  describe('DeviceEvent', () => {
    it('should have correct structure', () => {
      const event: DeviceEvent = {
        id: 1,
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: new Date('2023-01-01T00:00:00Z'),
        created_at: new Date('2023-01-01T00:00:00Z'),
      };

      expect(event.id).toBe(1);
      expect(event.device_id).toBe('device123');
      expect(event.event_type).toBe('click');
      expect(event.event_data).toEqual({ button: 'submit' });
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.created_at).toBeInstanceOf(Date);
    });

    it('should allow optional fields', () => {
      const event: DeviceEvent = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
      };

      expect(event.id).toBeUndefined();
      expect(event.timestamp).toBeUndefined();
      expect(event.created_at).toBeUndefined();
    });

    it('should allow any event_data structure', () => {
      const event: DeviceEvent = {
        device_id: 'device123',
        event_type: 'click',
        event_data: {
          button: 'submit',
          page: 'home',
          user_id: 123,
          metadata: {
            browser: 'chrome',
            version: '1.0.0',
          },
        },
      };

      expect(event.event_data).toEqual({
        button: 'submit',
        page: 'home',
        user_id: 123,
        metadata: {
          browser: 'chrome',
          version: '1.0.0',
        },
      });
    });
  });

  describe('IngestEventRequest', () => {
    it('should have correct structure', () => {
      const request: IngestEventRequest = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: '2023-01-01T00:00:00Z',
      };

      expect(request.device_id).toBe('device123');
      expect(request.event_type).toBe('click');
      expect(request.event_data).toEqual({ button: 'submit' });
      expect(request.timestamp).toBe('2023-01-01T00:00:00Z');
    });

    it('should allow optional timestamp', () => {
      const request: IngestEventRequest = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
      };

      expect(request.timestamp).toBeUndefined();
    });

    it('should allow any event_data structure', () => {
      const request: IngestEventRequest = {
        device_id: 'device123',
        event_type: 'page_view',
        event_data: {
          url: '/home',
          referrer: 'https://google.com',
          user_agent: 'Mozilla/5.0...',
        },
      };

      expect(request.event_data).toEqual({
        url: '/home',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0...',
      });
    });
  });

  describe('QueryEventsRequest', () => {
    it('should have correct structure with all fields', () => {
      const request: QueryEventsRequest = {
        device_id: 'device123',
        event_type: 'click',
        start_time: '2023-01-01T00:00:00Z',
        end_time: '2023-01-02T00:00:00Z',
        limit: 50,
        offset: 10,
      };

      expect(request.device_id).toBe('device123');
      expect(request.event_type).toBe('click');
      expect(request.start_time).toBe('2023-01-01T00:00:00Z');
      expect(request.end_time).toBe('2023-01-02T00:00:00Z');
      expect(request.limit).toBe(50);
      expect(request.offset).toBe(10);
    });

    it('should allow all optional fields', () => {
      const request: QueryEventsRequest = {};

      expect(request.device_id).toBeUndefined();
      expect(request.event_type).toBeUndefined();
      expect(request.start_time).toBeUndefined();
      expect(request.end_time).toBeUndefined();
      expect(request.limit).toBeUndefined();
      expect(request.offset).toBeUndefined();
    });

    it('should allow partial filtering', () => {
      const request: QueryEventsRequest = {
        device_id: 'device123',
        limit: 25,
      };

      expect(request.device_id).toBe('device123');
      expect(request.event_type).toBeUndefined();
      expect(request.limit).toBe(25);
    });
  });

  describe('QueryEventsResponse', () => {
    it('should have correct structure', () => {
      const events: DeviceEvent[] = [
        {
          id: 1,
          device_id: 'device123',
          event_type: 'click',
          event_data: { button: 'submit' },
          timestamp: new Date('2023-01-01T00:00:00Z'),
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      const response: QueryEventsResponse = {
        events,
        total: 1,
        limit: 100,
        offset: 0,
      };

      expect(response.events).toEqual(events);
      expect(response.total).toBe(1);
      expect(response.limit).toBe(100);
      expect(response.offset).toBe(0);
    });

    it('should handle empty results', () => {
      const response: QueryEventsResponse = {
        events: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      expect(response.events).toEqual([]);
      expect(response.total).toBe(0);
    });

    it('should handle pagination', () => {
      const response: QueryEventsResponse = {
        events: [],
        total: 1000,
        limit: 50,
        offset: 100,
      };

      expect(response.total).toBe(1000);
      expect(response.limit).toBe(50);
      expect(response.offset).toBe(100);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow DeviceEvent to be used in QueryEventsResponse', () => {
      const event: DeviceEvent = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
      };

      const response: QueryEventsResponse = {
        events: [event],
        total: 1,
        limit: 100,
        offset: 0,
      };

      expect(response.events[0]).toEqual(event);
    });

    it('should allow IngestEventRequest to be converted to DeviceEvent', () => {
      const request: IngestEventRequest = {
        device_id: 'device123',
        event_type: 'click',
        event_data: { button: 'submit' },
        timestamp: '2023-01-01T00:00:00Z',
      };

      const event: DeviceEvent = {
        device_id: request.device_id,
        event_type: request.event_type,
        event_data: request.event_data,
        severity: request.severity,
        ttl: request.ttl ? new Date(request.ttl) : undefined,
        timestamp: request.timestamp ? new Date(request.timestamp) : undefined,
      };

      expect(event.device_id).toBe(request.device_id);
      expect(event.event_type).toBe(request.event_type);
      expect(event.event_data).toEqual(request.event_data);
      expect(event.timestamp).toEqual(new Date('2023-01-01T00:00:00Z'));
    });
  });
});

