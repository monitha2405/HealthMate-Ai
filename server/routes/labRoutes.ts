import { Router } from 'express';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';
import { generateText, isGeminiAvailable } from '../services/gemini';
import { retrieveRelevantChunks } from '../services/ragService';
import { classifyIntent } from '../services/agents/orchestrator';
import { executeTool, toolsRegistry } from '../services/tools';
import { runFullEvaluationSuite } from '../evaluation/evalSuite';
import type { AgentExecutionTrace } from '../../src/types';

const router = Router();

// A. Prompt Engineering Playground
router.post('/prompt', requireGuestSession, async (req, res) => {
  const { systemPrompt = '', userPrompt, temperature } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'User prompt is required.' });
  }

  const start = Date.now();
  if (isGeminiAvailable()) {
    try {
      const result = await generateText({
        prompt: userPrompt,
        systemInstruction: systemPrompt || undefined,
        temperature
      });
      return res.json({
        response: result.text,
        latencyMs: Date.now() - start,
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.json({
    response: `[Academic Simulated LLM Response]\nSystem Instruction: ${systemPrompt || 'None'}\nReceived Query: "${userPrompt}"\n\nResult: In biomedical research, prompt conditioning structures the LLM attention matrix to prioritize domain-specific tokens.`,
    latencyMs: Date.now() - start,
    model: 'simulated-engine'
  });
});

// B. RAG Inspector (pgvector Semantic Search)
router.post('/rag-inspect', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { query: searchQuery, topK = 3 } = req.body;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Query is required for RAG inspection.' });
  }

  try {
    const start = Date.now();
    const chunks = await retrieveRelevantChunks(searchQuery, guestId, Number(topK));
    const latencyMs = Date.now() - start;

    // Fetch total chunk count for guest in PostgreSQL
    const totalCountRes = await query(
      'SELECT COUNT(*) as count FROM document_chunks WHERE guest_id = $1',
      [guestId]
    );

    res.json({
      query: searchQuery,
      totalUserChunksIndexed: parseInt(totalCountRes.rows[0]?.count || '0', 10),
      topK: Number(topK),
      latencyMs,
      retrievedChunks: chunks
    });
  } catch (error: any) {
    console.error('RAG inspect error:', error);
    res.status(500).json({ error: 'RAG inspection failed', details: error.message });
  }
});

// C. Standard LLM vs RAG Comparison
router.post('/compare-rag', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { query: searchQuery } = req.body;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  try {
    const chunks = await retrieveRelevantChunks(searchQuery, guestId, 3);
    const context = chunks.map(c => c.content).join('\n\n');

    let baseResponse = '';
    let ragResponse = '';

    if (isGeminiAvailable()) {
      try {
        // 1. Base LLM call
        const resBase = await generateText({
          prompt: `Answer this question based on general knowledge: ${searchQuery}`
        });
        baseResponse = resBase.text;

        // 2. Grounded RAG call
        const resRag = await generateText({
          prompt: `Answer this question strictly using the provided context excerpt:\n\n<CONTEXT>\n${context || 'No documents uploaded.'}\n</CONTEXT>\n\nQuestion: ${searchQuery}`
        });
        ragResponse = resRag.text;
      } catch (e: any) {
        console.warn('Compare RAG Gemini error:', e);
      }
    }

    if (!baseResponse) {
      baseResponse = `Standard Model: Answering "${searchQuery}" using pre-trained parametric knowledge without access to your private medical files.`;
    }
    if (!ragResponse) {
      ragResponse = chunks.length > 0
        ? `RAG Grounded Model: Answering "${searchQuery}" conditioned on ${chunks.length} retrieved pgvector chunks from "${chunks[0].documentTitle}".`
        : `RAG Grounded Model: No relevant document chunks found in your personal storage. Unable to ground response without uploaded records.`;
    }

    res.json({
      query: searchQuery,
      baseResponse,
      ragResponse,
      sourcesUsed: chunks,
      groundingExplanation: chunks.length > 0
        ? 'The RAG pipeline appended retrieved pgvector cosine chunks into the prompt context, grounding the LLM in the user’s specific medical report rather than relying on parametric memory.'
        : 'No user document matched the query; RAG detected the absence of ground-truth evidence.'
    });
  } catch (error: any) {
    console.error('Compare RAG error:', error);
    res.status(500).json({ error: 'Failed to compare LLM vs RAG', details: error.message });
  }
});

// D. Agent Routing Visualizer
router.post('/routing', requireGuestSession, (req, res) => {
  const { query: searchQuery } = req.body;
  if (!searchQuery) return res.status(400).json({ error: 'Query is required.' });

  const classification = classifyIntent(searchQuery);

  res.json({
    query: searchQuery,
    intent: classification.intent,
    selectedAgent: classification.agent,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    availableAgents: [
      'Health Document Agent',
      'Health Trend Analysis Agent',
      'Nutrition Agent',
      'Wellness and Habit Agent',
      'General Health Knowledge Agent'
    ]
  });
});

// E. Tool Calling Laboratory
router.get('/tools', requireGuestSession, (_req, res) => {
  const tools = Object.values(toolsRegistry).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }));
  res.json({ tools });
});

router.post('/execute-tool', requireGuestSession, async (req, res) => {
  const { toolName, args } = req.body;
  if (!toolName) return res.status(400).json({ error: 'toolName is required.' });

  try {
    const start = Date.now();
    const result = await executeTool(toolName, args);
    res.json({
      toolName,
      args,
      result,
      latencyMs: Date.now() - start
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// F. Memory Inspector
router.get('/memory', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const memoryRows = await query(
      'SELECT * FROM user_memories WHERE guest_id = $1 ORDER BY created_at DESC',
      [guestId]
    );

    res.json({
      consentAllowed: true,
      memories: memoryRows.rows.map((m: any) => ({
        id: m.id,
        category: m.category,
        content: m.content,
        createdAt: m.created_at
      }))
    });
  } catch (error: any) {
    console.error('Failed to get memory:', error);
    res.status(500).json({ error: 'Failed to retrieve memory', details: error.message });
  }
});

router.post('/memory/consent', requireGuestSession, async (_req, res) => {
  const { allowed } = _req.body;
  res.json({ success: true, consentAllowed: !!allowed });
});

router.delete('/memory', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  try {
    await query('DELETE FROM user_memories WHERE guest_id = $1', [guestId]);
    res.json({ success: true, message: 'User conversational memory purged.' });
  } catch (error: any) {
    console.error('Failed to purge memory:', error);
    res.status(500).json({ error: 'Failed to purge memory', details: error.message });
  }
});

// G. Academic Evaluation Laboratory
router.post('/evaluation/run', requireGuestSession, async (_req, res) => {
  try {
    const summary = await runFullEvaluationSuite();
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to run evaluation suite', details: e.message });
  }
});

// H. Telemetry & Observability
router.get('/observability', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const rows = await query(
      'SELECT * FROM agent_execution_logs WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 50',
      [guestId]
    );

    const traces: AgentExecutionTrace[] = rows.rows.map((r: any) => ({
      id: r.id,
      timestamp: r.created_at,
      query: r.query,
      intent: r.intent,
      agentSelected: r.agent_selected,
      agentReasoning: r.reasoning,
      toolsCalled: typeof r.tools_invoked === 'string' ? JSON.parse(r.tools_invoked) : (r.tools_invoked || []),
      ragChunksRetrieved: Number(r.rag_chunks_count || 0),
      latencyMs: Number(r.latency_ms || 0),
      tokensUsedEstimated: Number(r.tokens_estimated || 0),
      status: r.status
    }));

    res.json({ traces });
  } catch (error: any) {
    console.error('Failed to retrieve observability traces:', error);
    res.status(500).json({ error: 'Failed to retrieve observability traces', details: error.message });
  }
});

export default router;
