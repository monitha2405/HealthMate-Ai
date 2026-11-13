import { Router } from 'express';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';
import { orchestrateQuery } from '../services/agents/orchestrator';
import type { ChatMessage } from '../../src/types';

const router = Router();

// POST /api/chat - Central multi-agent interaction endpoint
router.post('/', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { message, history = [], enableMemory = false } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const result = await orchestrateQuery({
      guestId,
      query: message.trim(),
      conversationHistory: history,
      enableMemory
    });

    res.json({
      message: result.message,
      trace: result.trace
    });
  } catch (error: any) {
    console.error('Chat orchestration error:', error);
    res.status(500).json({
      error: 'Failed to process chat query.',
      details: error.message
    });
  }
});

// GET /api/chat/history - Retrieve guest conversation history
router.get('/history', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const result = await query(
      'SELECT * FROM conversation_messages WHERE guest_id = $1 ORDER BY created_at ASC',
      [guestId]
    );

    const messages: ChatMessage[] = result.rows.map((r: any) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      timestamp: r.created_at,
      agentUsed: r.agent_selected || undefined,
      toolsInvoked: r.tools_invoked ? (typeof r.tools_invoked === 'string' ? JSON.parse(r.tools_invoked) : r.tools_invoked) : undefined,
      sources: r.sources ? (typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources) : undefined,
      safetyWarning: r.safety_warning || undefined,
      isEmergencyAlert: r.is_emergency === true || r.is_emergency === 1
    }));

    res.json({ messages });
  } catch (error: any) {
    console.error('Failed to load chat history:', error);
    res.status(500).json({ error: 'Failed to load conversation history', details: error.message });
  }
});

// DELETE /api/chat/history - Clear conversation history for current guest
router.delete('/history', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    await query(
      'DELETE FROM conversation_messages WHERE guest_id = $1',
      [guestId]
    );

    res.json({ success: true, message: 'Conversation history cleared.' });
  } catch (error: any) {
    console.error('Failed to clear chat history:', error);
    res.status(500).json({ error: 'Failed to clear conversation history', details: error.message });
  }
});

export default router;
