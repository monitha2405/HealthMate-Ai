import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';
import type { HealthMeasurement } from '../../src/types';

const router = Router();

// GET /api/tracker
router.get('/', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const result = await query(
      'SELECT * FROM health_measurements WHERE guest_id = $1 ORDER BY recorded_at DESC',
      [guestId]
    );

    const measurements: HealthMeasurement[] = result.rows.map((r: any) => ({
      id: r.id,
      userId: r.guest_id,
      type: r.type,
      value: Number(r.value),
      secondaryValue: r.secondary_value !== null && r.secondary_value !== undefined ? Number(r.secondary_value) : undefined,
      unit: r.unit,
      timestamp: r.recorded_at,
      notes: r.notes || undefined,
      source: r.source,
      documentId: r.document_id || undefined
    }));

    res.json({ measurements });
  } catch (error: any) {
    console.error('Failed to get measurements:', error);
    res.status(500).json({ error: 'Failed to retrieve measurements', details: error.message });
  }
});

// POST /api/tracker
router.post('/', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { type, value, secondaryValue, unit, timestamp, notes, source = 'manual', documentId } = req.body;

  if (!type || value === undefined || isNaN(Number(value))) {
    return res.status(400).json({ error: 'Valid measurement type and numerical value are required.' });
  }

  const id = crypto.randomUUID();
  const entryTime = timestamp || new Date().toISOString();

  try {
    await query(
      `INSERT INTO health_measurements (id, guest_id, type, value, secondary_value, unit, recorded_at, notes, source, document_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        guestId,
        type,
        Number(value),
        secondaryValue !== undefined && !isNaN(Number(secondaryValue)) ? Number(secondaryValue) : null,
        unit || '',
        entryTime,
        notes || null,
        source,
        documentId || null
      ]
    );

    const measurement: HealthMeasurement = {
      id,
      userId: guestId,
      type,
      value: Number(value),
      secondaryValue: secondaryValue !== undefined && !isNaN(Number(secondaryValue)) ? Number(secondaryValue) : undefined,
      unit: unit || '',
      timestamp: entryTime,
      notes,
      source,
      documentId
    };

    res.status(201).json({ measurement });
  } catch (error: any) {
    console.error('Failed to create measurement:', error);
    res.status(500).json({ error: 'Failed to save measurement', details: error.message });
  }
});

// DELETE /api/tracker/:id
router.delete('/:id', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { id } = req.params;

  try {
    const existing = await query(
      'SELECT id FROM health_measurements WHERE id = $1 AND guest_id = $2',
      [id, guestId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found or unauthorized.' });
    }

    await query(
      'DELETE FROM health_measurements WHERE id = $1 AND guest_id = $2',
      [id, guestId]
    );

    res.json({ success: true, message: 'Measurement deleted successfully.' });
  } catch (error: any) {
    console.error('Failed to delete measurement:', error);
    res.status(500).json({ error: 'Failed to delete measurement', details: error.message });
  }
});

export default router;
