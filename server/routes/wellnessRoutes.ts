import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';
import type { WellnessHabit } from '../../src/types';

const router = Router();

const DEFAULT_HABITS = [
  { category: 'water', name: 'Daily Water Intake', target_value: 8, unit: 'glasses' },
  { category: 'sleep', name: 'Restful Night Sleep', target_value: 7.5, unit: 'hours' },
  { category: 'activity', name: 'Daily Physical Steps', target_value: 8000, unit: 'steps' },
  { category: 'meditation', name: 'Mindfulness & Breathing', target_value: 15, unit: 'mins' }
];

// GET /api/wellness/habits
router.get('/habits', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const today = new Date().toISOString().slice(0, 10);

  try {
    let habitRows = await query(
      'SELECT * FROM habits WHERE guest_id = $1 ORDER BY created_at ASC',
      [guestId]
    );

    // Seed default habits for today if user has no habits yet
    if (habitRows.rows.length === 0) {
      for (const h of DEFAULT_HABITS) {
        const habitId = crypto.randomUUID();
        await query(
          'INSERT INTO habits (id, guest_id, category, name, target_value, unit, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [habitId, guestId, h.category, h.name, h.target_value, h.unit]
        );
        await query(
          'INSERT INTO habit_logs (id, habit_id, guest_id, logged_date, current_value, completed, streak_days) VALUES ($1, $2, $3, $4, 0, FALSE, 1)',
          [crypto.randomUUID(), habitId, guestId, today]
        );
      }

      habitRows = await query(
        'SELECT * FROM habits WHERE guest_id = $1 ORDER BY created_at ASC',
        [guestId]
      );
    }

    const logRows = await query(
      'SELECT * FROM habit_logs WHERE guest_id = $1',
      [guestId]
    );

    const logsByHabit = new Map<string, any>();
    for (const log of logRows.rows) {
      logsByHabit.set(log.habit_id, log);
    }

    const habits: WellnessHabit[] = habitRows.rows.map((h: any) => {
      const log = logsByHabit.get(h.id);
      return {
        id: h.id,
        userId: h.guest_id,
        category: h.category,
        name: h.name,
        targetValue: Number(h.target_value),
        currentValue: log ? Number(log.current_value) : 0,
        unit: h.unit,
        completed: log ? (log.completed === true || log.completed === 1) : false,
        streakDays: log ? Number(log.streak_days) : 1,
        date: today
      };
    });

    res.json({ habits });
  } catch (error: any) {
    console.error('Failed to get wellness habits:', error);
    res.status(500).json({ error: 'Failed to retrieve habits', details: error.message });
  }
});

// POST /api/wellness/habits
router.post('/habits', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { category = 'activity', name, targetValue = 1, unit = 'times' } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Habit name is required.' });
  }

  const habitId = crypto.randomUUID();
  const logId = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  try {
    await query(
      'INSERT INTO habits (id, guest_id, category, name, target_value, unit, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [habitId, guestId, category, name.trim(), Number(targetValue), unit]
    );

    await query(
      'INSERT INTO habit_logs (id, habit_id, guest_id, logged_date, current_value, completed, streak_days) VALUES ($1, $2, $3, $4, 0, FALSE, 1)',
      [logId, habitId, guestId, today]
    );

    const habit: WellnessHabit = {
      id: habitId,
      userId: guestId,
      category,
      name: name.trim(),
      targetValue: Number(targetValue),
      currentValue: 0,
      unit,
      completed: false,
      streakDays: 1,
      date: today
    };

    res.status(201).json({ habit });
  } catch (error: any) {
    console.error('Failed to add wellness habit:', error);
    res.status(500).json({ error: 'Failed to add habit', details: error.message });
  }
});

// PATCH /api/wellness/habits/:id
router.patch('/habits/:id', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const id = req.params.id;
  const { currentValue, completed } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const habitRes = await query(
      'SELECT * FROM habits WHERE id = $1 AND guest_id = $2',
      [id, guestId]
    );

    if (habitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit record not found or unauthorized.' });
    }

    const habit = habitRes.rows[0];

    const targetVal = Number(habit.target_value);
    const newCurrent = currentValue !== undefined ? Number(currentValue) : 0;
    const isCompleted = completed !== undefined ? !!completed : (newCurrent >= targetVal);

    await query(
      'INSERT INTO habit_logs (id, habit_id, guest_id, logged_date, current_value, completed, streak_days) VALUES ($1, $2, $3, $4, $5, $6, 1)',
      [crypto.randomUUID(), id, guestId, today, newCurrent, isCompleted]
    );

    const responseHabit: WellnessHabit = {
      id: habit.id,
      userId: habit.guest_id,
      category: habit.category,
      name: habit.name,
      targetValue: targetVal,
      currentValue: newCurrent,
      unit: habit.unit,
      completed: isCompleted,
      streakDays: isCompleted ? 2 : 1,
      date: today
    };

    res.json({ habit: responseHabit });
  } catch (error: any) {
    console.error('Failed to update habit:', error);
    res.status(500).json({ error: 'Failed to update habit', details: error.message });
  }
});

export default router;
