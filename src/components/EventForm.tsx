import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Button } from './catalyst/button';
import { Field, Label, ErrorMessage } from './catalyst/fieldset';
import { Input } from './catalyst/input';
import { Textarea } from './catalyst/textarea';
import { Select } from './catalyst/select';

interface EventFormProps {
  eventId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  time_zone: string;
  location: string;
  location_details?: string;
  type: string;
  tags: string;
}

export default function EventForm({ eventId, onSuccess, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState<EventData>({
    title: '',
    description: '',
    date: '',
    time: '',
    time_zone: 'CST',
    location: '',
    location_details: '',
    type: 'meetup',
    tags: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(!!eventId);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  async function loadEvent() {
    try {
      const event = await pb.collection('events').getOne(eventId!);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        time: event.time || '',
        time_zone: event.time_zone || 'CST',
        location: event.location || '',
        location_details: event.location_details || '',
        type: event.type || 'meetup',
        tags: event.tags || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setIsLoadingEvent(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (eventId) {
        // Update existing event
        await pb.collection('events').update(eventId, formData);
      } else {
        // Create new event
        await pb.collection('events').create(formData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = '/app/manage-events';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(field: keyof EventData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoadingEvent) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading event...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <Field>
        <Label>Title *</Label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
        />
      </Field>

      <Field>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field>
          <Label>Date *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </Field>

        <Field>
          <Label>Time *</Label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange('time', e.target.value)}
            required
          />
        </Field>
      </div>

      <Field>
        <Label>Time Zone</Label>
        <Select
          value={formData.time_zone}
          onChange={(e) => handleChange('time_zone', e.target.value)}
        >
          <option value="CST">CST</option>
          <option value="EST">EST</option>
          <option value="PST">PST</option>
          <option value="MST">MST</option>
        </Select>
      </Field>

      <Field>
        <Label>Location *</Label>
        <Input
          type="text"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="e.g., Zoom, Capsher Technologies"
          required
        />
      </Field>

      <Field>
        <Label>Location Details</Label>
        <Input
          type="text"
          value={formData.location_details}
          onChange={(e) => handleChange('location_details', e.target.value)}
          placeholder="e.g., Address or meeting link"
        />
      </Field>

      <Field>
        <Label>Type *</Label>
        <Select
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value)}
        >
          <option value="meetup">Meetup</option>
          <option value="book-club">Book Club</option>
        </Select>
      </Field>

      <Field>
        <Label>Tags</Label>
        <Input
          type="text"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          placeholder="e.g., algorithms, networking"
        />
      </Field>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" plain onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : eventId ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
