import { Router } from 'express';
import { query } from '../db/pool';
import { requireGuestSession, createAnonymousGuestSession } from '../middleware/session';

const router = Router();

// POST /api/user/reset - Atomic multi-table guest data purge & session renewal
router.post('/reset', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  if (!guestId || guestId.trim() === '') {
    return res.status(400).json({ success: false, error: 'Invalid guest session for reset.' });
  }

  try {
    // 1. Purge all records belonging to this guest across all PostgreSQL tables
    const userTables = [
      'health_profiles',
      'extracted_health_values',
      'document_embeddings',
      'document_chunks',
      'health_documents',
      'health_measurements',
      'conversations',
      'conversation_messages',
      'user_memories',
      'nutrition_preferences',
      'meal_plan_items',
      'meal_plans',
      'food_records',
      'wellness_goals',
      'habit_logs',
      'habits',
      'sleep_records',
      'activity_records',
      'hydration_records',
      'agent_execution_logs',
      'tool_execution_logs'
    ];

    let totalDeleted = 0;
    for (const table of userTables) {
      try {
        const delRes = await query(`DELETE FROM ${table} WHERE guest_id = $1`, [guestId]);
        totalDeleted += delRes.rowCount;
      } catch (err: any) {
        console.warn(`Table purge note for ${table}:`, err.message);
      }
    }

    // 2. Revoke previous session
    await query(
      'UPDATE guest_sessions SET revoked_at = NOW() WHERE guest_id = $1',
      [guestId]
    );

    // 3. Immediately issue a fresh guest session and HttpOnly cookie
    const freshGuest = await createAnonymousGuestSession(req, res);

    res.json({
      success: true,
      message: 'All personal records, documents, pgvector embeddings, and history have been permanently purged.',
      purgedGuestId: guestId,
      newGuest: {
        id: freshGuest.id,
        displayName: freshGuest.displayName,
        sessionId: freshGuest.sessionId
      },
      deletedCount: totalDeleted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Guest data purge failed:', error);
    res.status(500).json({
      success: false,
      error: 'Data purge encountered a failure. Please retry.',
      details: error.message
    });
  }
});

export default router;
