import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';

const router = Router();

// GET /api/session/current - Returns current guest session information
router.get('/session/current', requireGuestSession, (req, res) => {
  const guest = req.guest!;
  res.json({
    guest: {
      id: guest.id,
      displayName: guest.displayName,
      sessionId: guest.sessionId,
      isAnonymous: true
    }
  });
});

// GET /api/user/profile - Returns health profile for current guest
router.get('/user/profile', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const profileRes = await query(
      'SELECT * FROM health_profiles WHERE guest_id = $1',
      [guestId]
    );

    if (profileRes.rows.length === 0) {
      return res.json({
        profile: {
          uid: guestId,
          isAnonymous: true,
          displayName: req.guest!.displayName || 'Guest User',
          updatedAt: new Date().toISOString()
        }
      });
    }

    const row = profileRes.rows[0];
    res.json({
      profile: {
        uid: guestId,
        isAnonymous: true,
        displayName: row.display_name || req.guest!.displayName || 'Guest User',
        age: row.age || undefined,
        gender: row.gender || undefined,
        heightCm: row.height_cm ? Number(row.height_cm) : undefined,
        weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
        bloodGroup: row.blood_group || undefined,
        knownConditions: row.known_conditions || [],
        allergies: row.allergies || [],
        dietaryPreference: row.dietary_preference || undefined,
        updatedAt: row.updated_at
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch guest profile:', error);
    res.status(500).json({ error: 'Failed to retrieve profile', details: error.message });
  }
});

// POST /api/user/profile - Upserts guest profile in PostgreSQL
router.post('/user/profile', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const {
    displayName,
    age,
    gender,
    heightCm,
    weightKg,
    bloodGroup,
    knownConditions = [],
    allergies = [],
    dietaryPreference
  } = req.body;

  const now = new Date().toISOString();
  const profileId = crypto.randomUUID();

  try {
    // 1. Update display_name in guests table if provided
    if (displayName) {
      await query(
        'UPDATE guests SET display_name = $1, updated_at = NOW() WHERE id = $2',
        [displayName, guestId]
      );
      req.guest!.displayName = displayName;
    }

    // 2. Upsert health_profiles record
    await query(
      `INSERT INTO health_profiles (
        id, guest_id, display_name, age, gender, height_cm, weight_kg, blood_group,
        known_conditions, allergies, dietary_preference, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (guest_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, health_profiles.display_name),
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        blood_group = EXCLUDED.blood_group,
        known_conditions = EXCLUDED.known_conditions,
        allergies = EXCLUDED.allergies,
        dietary_preference = EXCLUDED.dietary_preference,
        updated_at = NOW()`,
      [
        profileId,
        guestId,
        displayName || req.guest!.displayName || 'Guest User',
        age ? Number(age) : null,
        gender || null,
        heightCm ? Number(heightCm) : null,
        weightKg ? Number(weightKg) : null,
        bloodGroup || null,
        JSON.stringify(knownConditions),
        JSON.stringify(allergies),
        dietaryPreference || null
      ]
    );

    res.json({
      success: true,
      profile: {
        uid: guestId,
        isAnonymous: true,
        displayName: displayName || req.guest!.displayName || 'Guest User',
        age: age ? Number(age) : undefined,
        gender,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        bloodGroup,
        knownConditions,
        allergies,
        dietaryPreference,
        updatedAt: now
      }
    });
  } catch (error: any) {
    console.error('Failed to update guest profile:', error);
    res.status(500).json({ error: 'Failed to save profile', details: error.message });
  }
});

export default router;
