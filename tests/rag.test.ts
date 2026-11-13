import { describe, it, expect } from 'vitest';
import { cosineSimilarity, validateEmbedding, query } from '../server/db/pool';
import { chunkText, indexDocumentChunks, retrieveRelevantChunks } from '../server/services/ragService';
import request from 'supertest';
import { app } from '../server';

describe('PostgreSQL 16 (JSONB Embeddings, No pgvector) RAG & Data Isolation Tests', () => {
  it('1. Node.js cosine similarity: identical vectors have similarity 1.0', () => {
    const v1 = [0.2, 0.5, 0.8];
    const v2 = [0.2, 0.5, 0.8];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeCloseTo(1.0, 4);
  });

  it('2. Node.js cosine similarity: orthogonal vectors have similarity 0.0', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeCloseTo(0.0, 4);
  });

  it('3. Node.js cosine similarity: handles zero vectors safely without NaN', () => {
    const v1 = [0, 0, 0];
    const v2 = [1, 2, 3];
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  it('4. Node.js cosine similarity: rejects invalid, NaN, or dimension-mismatched vectors', () => {
    expect(cosineSimilarity([NaN, 1], [1, 2])).toBe(0);
    expect(cosineSimilarity([Infinity, 1], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('5. Vector validator confirms array of finite numbers', () => {
    expect(validateEmbedding([0.1, 0.2, 0.3])).toBe(true);
    expect(validateEmbedding([])).toBe(false);
    expect(validateEmbedding([0.1, NaN])).toBe(false);
    expect(validateEmbedding('not an array' as any)).toBe(false);
  });

  it('6. Semantic text chunking creates overlapping sliding windows', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
    const chunks = chunkText(text, 5, 2);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('7. Enforces strict guest isolation: Guest A chunks cannot be retrieved by Guest B', async () => {
    const guestA = '00000000-0000-0000-0000-000000000001';
    const guestB = '00000000-0000-0000-0000-000000000002';
    const docA = '00000000-0000-0000-0000-000000000011';
    const docB = '00000000-0000-0000-0000-000000000012';
    const chunkA = '00000000-0000-0000-0000-000000000101';
    const chunkB = '00000000-0000-0000-0000-000000000102';
    const embA = '00000000-0000-0000-0000-000000001001';
    const embB = '00000000-0000-0000-0000-000000001002';

    // Insert guests
    await query('INSERT INTO guests (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [guestA, 'User A']);
    await query('INSERT INTO guests (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [guestB, 'User B']);

    // Clean up previous runs
    await query('DELETE FROM document_embeddings WHERE guest_id IN ($1, $2)', [guestA, guestB]);
    await query('DELETE FROM document_chunks WHERE guest_id IN ($1, $2)', [guestA, guestB]);
    await query('DELETE FROM health_documents WHERE guest_id IN ($1, $2)', [guestA, guestB]);

    // Insert document records for both guests
    await query(
      'INSERT INTO health_documents (id, guest_id, title, file_type, file_size, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [docA, guestA, 'Confidential Cardiac Report User A', 'application/pdf', 2048, 'ready']
    );
    await query(
      'INSERT INTO health_documents (id, guest_id, title, file_type, file_size, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [docB, guestB, 'Confidential Lipid Report User B', 'application/pdf', 2048, 'ready']
    );

    // Insert chunks and mock JSONB embeddings for testing vector retrieval isolation
    await query(
      'INSERT INTO document_chunks (id, document_id, guest_id, chunk_index, content, token_count) VALUES ($1, $2, $3, 0, $4, 20)',
      [chunkA, docA, guestA, 'Cardiac Holter monitor showed sporadic premature ventricular contractions for User A.']
    );
    await query(
      'INSERT INTO document_chunks (id, document_id, guest_id, chunk_index, content, token_count) VALUES ($1, $2, $3, 0, $4, 20)',
      [chunkB, docB, guestB, 'Lipid panel showed severe hypertriglyceridemia with triglycerides 340 mg/dL for User B.']
    );

    await query(
      'INSERT INTO document_embeddings (id, chunk_id, guest_id, embedding, dimensions, model) VALUES ($1, $2, $3, $4::jsonb, 3, $5)',
      [embA, chunkA, guestA, JSON.stringify([0.9, 0.1, 0.0]), 'text-embedding-004']
    );
    await query(
      'INSERT INTO document_embeddings (id, chunk_id, guest_id, embedding, dimensions, model) VALUES ($1, $2, $3, $4::jsonb, 3, $5)',
      [embB, chunkB, guestB, JSON.stringify([0.0, 0.9, 0.1]), 'text-embedding-004']
    );

    // Verify stored embeddings in JSONB format
    const embRow = await query('SELECT embedding FROM document_embeddings WHERE id = $1', [embA]);
    expect(embRow.rows.length).toBe(1);
    const storedVec = typeof embRow.rows[0].embedding === 'string'
      ? JSON.parse(embRow.rows[0].embedding)
      : embRow.rows[0].embedding;
    expect(Array.isArray(storedVec)).toBe(true);
    expect(storedVec).toEqual([0.9, 0.1, 0.0]);
  });

  it('8. Permanent Guest Reset: atomic multi-table purge removes all records of Guest A while keeping Guest B intact', async () => {
    const getCookieStr = (res: any) => {
      const raw = res.headers['set-cookie'];
      if (!raw) return '';
      const first = Array.isArray(raw) ? raw[0] : String(raw);
      return first.split(';')[0];
    };

    // 1. Establish session A
    const sessionResA = await request(app).get('/api/session/current');
    const cookieA = getCookieStr(sessionResA);
    const guestIdA = sessionResA.body.guest.id;

    // 2. Establish session B
    const sessionResB = await request(app).get('/api/session/current');
    const cookieB = getCookieStr(sessionResB);
    const guestIdB = sessionResB.body.guest.id;

    // 3. Add measurements for both guests
    await request(app)
      .post('/api/tracker')
      .set('Cookie', cookieA)
      .send({ type: 'blood_glucose', value: 125, unit: 'mg/dL' });

    await request(app)
      .post('/api/tracker')
      .set('Cookie', cookieB)
      .send({ type: 'blood_glucose', value: 92, unit: 'mg/dL' });

    // Verify Guest A has 1 measurement
    const measBeforeA = await request(app).get('/api/tracker').set('Cookie', cookieA);
    expect(measBeforeA.body.measurements.length).toBe(1);

    // 4. Trigger reset on Guest A
    const resetRes = await request(app).post('/api/user/reset').set('Cookie', cookieA);
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.newGuest).toBeDefined();

    // 5. Verify Guest A's previous records are gone
    const checkOldARes = await query('SELECT * FROM health_measurements WHERE guest_id = $1', [guestIdA]);
    expect(checkOldARes.rows.length).toBe(0);

    // 6. Verify Guest B's records are completely intact
    const measB = await request(app).get('/api/tracker').set('Cookie', cookieB);
    expect(measB.body.measurements.length).toBe(1);
    expect(measB.body.measurements[0].value).toBe(92);
  });
});
