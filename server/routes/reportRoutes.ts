import { Router } from 'express';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';

const router = Router();

// GET /api/reports/summary
router.get('/summary', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    // 1. Fetch document & biomarker counts
    const totalDocsRes = await query(
      'SELECT COUNT(*) as count FROM health_documents WHERE guest_id = $1',
      [guestId]
    );
    const verifiedDocsRes = await query(
      'SELECT COUNT(*) as count FROM health_documents WHERE guest_id = $1 AND verified = TRUE',
      [guestId]
    );

    const abnormalValuesRes = await query(
      `SELECT v.id, v.name, v.value, v.unit, v.reference_range, v.status, v.verified, d.title as doc_title
       FROM extracted_health_values v
       JOIN health_documents d ON v.document_id = d.id
       WHERE v.guest_id = $1 AND v.status != 'normal'
       ORDER BY d.upload_date DESC`,
      [guestId]
    );

    // 2. Fetch measurements summary
    const measurementsRes = await query(
      'SELECT * FROM health_measurements WHERE guest_id = $1 ORDER BY recorded_at DESC',
      [guestId]
    );

    // 3. Fetch habits summary
    const habitsRes = await query(
      'SELECT * FROM habits WHERE guest_id = $1',
      [guestId]
    );
    const logsRes = await query(
      'SELECT * FROM habit_logs WHERE guest_id = $1',
      [guestId]
    );
    const completedHabits = logsRes.rows.filter((l: any) => l.completed === true || l.completed === 1).length;

    // 4. Fetch meal plan info
    const mealPlanRes = await query(
      'SELECT * FROM meal_plans WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 1',
      [guestId]
    );
    const nutritionPrefRes = await query(
      'SELECT * FROM nutrition_preferences WHERE guest_id = $1',
      [guestId]
    );

    const mealPlan = mealPlanRes.rows.length > 0
      ? (typeof mealPlanRes.rows[0].plan_data_json === 'string'
          ? JSON.parse(mealPlanRes.rows[0].plan_data_json)
          : mealPlanRes.rows[0].plan_data_json)
      : null;

    const preferences = nutritionPrefRes.rows.length > 0 ? nutritionPrefRes.rows[0] : null;

    res.json({
      documentStats: {
        total: parseInt(totalDocsRes.rows[0]?.count || '0', 10),
        verified: parseInt(verifiedDocsRes.rows[0]?.count || '0', 10)
      },
      abnormalBiomarkers: abnormalValuesRes.rows.map((v: any) => ({
        id: v.id,
        name: v.name,
        value: Number(v.value),
        unit: v.unit,
        referenceRange: v.reference_range,
        status: v.status,
        verified: v.verified === true || v.verified === 1,
        documentTitle: v.doc_title
      })),
      recentMeasurements: measurementsRes.rows.slice(0, 15).map((m: any) => ({
        id: m.id,
        type: m.type,
        value: Number(m.value),
        secondaryValue: m.secondary_value !== null ? Number(m.secondary_value) : undefined,
        unit: m.unit,
        timestamp: m.recorded_at,
        notes: m.notes
      })),
      wellnessStats: {
        totalHabits: habitsRes.rows.length,
        completedHabits,
        completionRate: habitsRes.rows.length > 0 ? Math.round((completedHabits / habitsRes.rows.length) * 100) : 0
      },
      nutritionOverview: {
        hasActivePlan: !!mealPlan,
        targetCalories: mealPlan?.totalCalories || null,
        dietPreference: preferences?.dietary_preference || null
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to generate reports summary:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

export default router;
