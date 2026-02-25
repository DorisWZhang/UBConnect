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

    it('fails when startAt is after endAt', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            startAt: new Date('2025-12-31'),
            endAt: new Date('2025-01-01'),
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('startAt must be before endAt');
    });

    it('passes when startAt is before endAt', () => {
        const result = validateEvent({
            title: 'Event',
            description: 'Desc',
            startAt: new Date('2025-01-01'),
            endAt: new Date('2025-12-31'),
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
            location: 'Kits Beach',
            category: 'Fitness',
            visibility: 'public',
            capacity: 12,
            createdBy: 'uid123',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
            startAt: { seconds: 1700100000, nanoseconds: 0 },
            endAt: { seconds: 1700200000, nanoseconds: 0 },
        };

        const event = fromFirestoreDoc('doc1', data);
        expect(event).not.toBeNull();
        expect(event!.id).toBe('doc1');
        expect(event!.title).toBe('Beach Volleyball');
        expect(event!.description).toBe('Meet at Kitsilano');
        expect(event!.location).toBe('Kits Beach');
        expect(event!.category).toBe('Fitness');
        expect(event!.visibility).toBe('public');
        expect(event!.capacity).toBe(12);
        expect(event!.createdBy).toBe('uid123');
        expect(event!.createdAt).toBeInstanceOf(Date);
        expect(event!.startAt).toBeInstanceOf(Date);
        expect(event!.endAt).toBeInstanceOf(Date);
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
        expect(event!.location).toBe('');
        expect(event!.category).toBe('');
        expect(event!.visibility).toBe('public');
        expect(event!.capacity).toBeNull();
        expect(event!.startAt).toBeNull();
        expect(event!.endAt).toBeNull();
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
            startAt: '2025-06-15T10:00:00Z',
        });
        expect(event!.startAt).toBeInstanceOf(Date);
    });
});
