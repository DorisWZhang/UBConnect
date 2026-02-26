// Unit tests for ConnectEvent validation and Firestore mapping
import {
    validateEvent,
    fromFirestoreDoc,
    ConnectEvent,
} from '../components/models/ConnectEvent';

// ---------------------------------------------------------------------------
// validateEvent()
// ---------------------------------------------------------------------------
describe('validateEvent', () => {
    it('passes for a valid event with all required fields', () => {
        const result = validateEvent({
            title: 'Study Group',
            description: 'Meet at the library',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('fails when title is missing', () => {
        const result = validateEvent({ description: 'Some description' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('title is required');
    });

    it('fails when title is empty string', () => {
        const result = validateEvent({ title: '   ', description: 'desc' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('title is required');
    });

    it('fails when description is missing', () => {
        const result = validateEvent({ title: 'My Event' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('description is required');
    });

    it('fails when both title and description are missing', () => {
        const result = validateEvent({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('title is required');
        expect(result.errors).toContain('description is required');
    });

    it('fails when capacity is negative', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            capacity: -1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('capacity must be a positive number');
    });

    it('fails when capacity is zero', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            capacity: 0,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('capacity must be a positive number');
    });

    it('passes when capacity is a valid positive number', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            capacity: 10,
        });
        expect(result.valid).toBe(true);
    });

    it('passes when capacity is null (optional)', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            capacity: null,
        });
        expect(result.valid).toBe(true);
    });

    it('fails when startTime is after endTime', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            startTime: new Date('2025-12-31'),
            endTime: new Date('2025-01-01'),
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('startTime must be before endTime');
    });

    it('passes when startTime is before endTime', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            startTime: new Date('2025-01-01'),
            endTime: new Date('2025-12-31'),
        });
        expect(result.valid).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// fromFirestoreDoc()
// ---------------------------------------------------------------------------
describe('fromFirestoreDoc', () => {
    it('maps a complete Firestore document to ConnectEvent', () => {
        const data = {
            title: 'Beach Volleyball',
            description: 'Meet at Kitsilano',
            locationName: 'Kits Beach',
            categoryId: 'Fitness',
            visibility: 'public',
            capacity: 12,
            createdBy: 'uid123',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
            startTime: { seconds: 1700100000, nanoseconds: 0 },
            endTime: { seconds: 1700200000, nanoseconds: 0 },
        };

        const event = fromFirestoreDoc('doc1', data);
        expect(event).not.toBeNull();
        expect(event!.id).toBe('doc1');
        expect(event!.title).toBe('Beach Volleyball');
        expect(event!.description).toBe('Meet at Kitsilano');
        expect(event!.locationName).toBe('Kits Beach');
        expect(event!.categoryId).toBe('Fitness');
        expect(event!.visibility).toBe('public');
        expect(event!.capacity).toBe(12);
        expect(event!.createdBy).toBe('uid123');
        expect(event!.createdAt).toBeInstanceOf(Date);
        expect(event!.startTime).toBeInstanceOf(Date);
        expect(event!.endTime).toBeInstanceOf(Date);
    });

    it('returns null for undefined data', () => {
        const event = fromFirestoreDoc('doc1', undefined);
        expect(event).toBeNull();
    });

    it('handles missing optional fields gracefully', () => {
        const data = {
            title: 'Quick Meetup',
            description: 'Coffee chat',
        };

        const event = fromFirestoreDoc('doc2', data);
        expect(event).not.toBeNull();
        expect(event!.title).toBe('Quick Meetup');
        expect(event!.locationName).toBe('');
        expect(event!.categoryId).toBe('');
        expect(event!.visibility).toBe('public');
        expect(event!.capacity).toBeNull();
        expect(event!.startTime).toBeNull();
        expect(event!.endTime).toBeNull();
        expect(event!.createdBy).toBe('');
    });

    it('defaults visibility to public for unknown values', () => {
        const event = fromFirestoreDoc('doc3', {
            title: 'Test',
            description: 'Test',
            visibility: 'invalid',
        });
        expect(event!.visibility).toBe('public');
    });

    it('handles friends visibility', () => {
        const event = fromFirestoreDoc('doc4', {
            title: 'Test',
            description: 'Test',
            visibility: 'friends',
        });
        expect(event!.visibility).toBe('friends');
    });

    it('handles non-numeric types for capacity', () => {
        const event = fromFirestoreDoc('doc5', {
            title: 'Test',
            description: 'Test',
            capacity: 'not-a-number',
        });
        expect(event!.capacity).toBeNull();
    });

    it('handles string dates', () => {
        const event = fromFirestoreDoc('doc6', {
            title: 'Test',
            description: 'Test',
            startTime: '2025-06-15T10:00:00Z',
        });
        expect(event!.startTime).toBeInstanceOf(Date);
    });

    it('maps legacy location/category fields', () => {
        const event = fromFirestoreDoc('legacy', {
            title: 'Legacy Event',
            description: 'Old schema',
            location: 'Old Location',
            category: 'Sports',
        });
        expect(event!.locationName).toBe('Old Location');
        expect(event!.categoryId).toBe('Sports');
    });

    it('maps legacy startAt/endAt fields', () => {
        const event = fromFirestoreDoc('legacy2', {
            title: 'Legacy Dates',
            description: 'With startAt',
            startAt: { seconds: 1700100000, nanoseconds: 0 },
            endAt: { seconds: 1700200000, nanoseconds: 0 },
        });
        expect(event!.startTime).toBeInstanceOf(Date);
        expect(event!.endTime).toBeInstanceOf(Date);
    });
});

// ---------------------------------------------------------------------------
// Max-length validation
// ---------------------------------------------------------------------------
describe('validateEvent max-length', () => {
    it('fails when title exceeds 80 characters', () => {
        const result = validateEvent({
            title: 'A'.repeat(81),
            description: 'Valid description',
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('title must be 80 characters or less');
    });

    it('passes with exactly 80-char title', () => {
        const result = validateEvent({
            title: 'A'.repeat(80),
            description: 'Valid description',
        });
        expect(result.valid).toBe(true);
    });

    it('fails when description exceeds 2000 characters', () => {
        const result = validateEvent({
            title: 'Valid title',
            description: 'D'.repeat(2001),
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('description must be 2000 characters or less');
    });

    it('passes with exactly 2000-char description', () => {
        const result = validateEvent({
            title: 'Valid title',
            description: 'D'.repeat(2000),
        });
        expect(result.valid).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// locationGeo fields
// ---------------------------------------------------------------------------
describe('fromFirestoreDoc locationGeo', () => {
    it('maps locationGeo from plain object', () => {
        const event = fromFirestoreDoc('doc7', {
            title: 'Geo Event',
            description: 'With coords',
            locationGeo: { latitude: 49.2606, longitude: -123.246 },
        });
        expect(event!.locationGeo).toEqual({ latitude: 49.2606, longitude: -123.246 });
    });

    it('maps legacy latitude/longitude fields to locationGeo', () => {
        const event = fromFirestoreDoc('doc8', {
            title: 'Legacy Geo',
            description: 'With old coords',
            latitude: 49.2606,
            longitude: -123.246,
        });
        expect(event!.locationGeo).toEqual({ latitude: 49.2606, longitude: -123.246 });
    });

    it('defaults locationGeo to null when missing', () => {
        const event = fromFirestoreDoc('doc9', {
            title: 'No Coords',
            description: 'Without coords',
        });
        expect(event!.locationGeo).toBeNull();
    });

    it('defaults non-numeric latitude/longitude to null locationGeo', () => {
        const event = fromFirestoreDoc('doc10', {
            title: 'Test',
            description: 'Test',
            latitude: 'not-a-number',
            longitude: null,
        });
        expect(event!.locationGeo).toBeNull();
    });
});
