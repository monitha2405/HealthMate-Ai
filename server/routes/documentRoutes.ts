/**
 * HealthMate AI — Health Document Routes
 * 
 * Supports PDF, JPG, JPEG, PNG document uploads.
 * Text extraction via pdf-parse (PDF) and tesseract.js (images).
 * RAG indexing via Gemini embeddings stored in PostgreSQL JSONB.
 */
import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { query } from '../db/pool.js';
import { requireGuestSession } from '../middleware/session.js';
import { extractMedicalValuesFromText } from '../services/medicalExtractor.js';
import { indexDocumentChunks } from '../services/ragService.js';
import type { HealthDocument, MedicalValue } from '../../src/types/index.js';

const router = Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10)) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();

    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed.'));
    }
  },
});

/**
 * Extract text from an uploaded file buffer.
 * Uses pdf-parse for PDFs and tesseract.js for images.
 */
async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ text: string; method: string }> {
  const normalizedMime = mimeType.toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  // PDF extraction
  if (normalizedMime === 'application/pdf' || ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = data.text?.trim() ?? '';
      if (text.length > 20) {
        return { text, method: 'pdf-parse' };
      }
    } catch (err: any) {
      console.warn('[PDF] pdf-parse failed:', err.message);
    }
  }

  // Image OCR via tesseract.js
  if (
    normalizedMime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png'].includes(ext)
  ) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      const text = data.text?.trim() ?? '';
      if (text.length > 10) {
        return { text, method: 'tesseract-ocr' };
      }
    } catch (err: any) {
      console.warn('[OCR] tesseract.js failed:', err.message);
    }
  }

  // If extraction yielded nothing meaningful, return empty with note
  return { text: '', method: 'none' };
}

// ─── GET /api/documents ───────────────────────────────────────────────────
router.get('/', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const docRows = await query(
      'SELECT * FROM health_documents WHERE guest_id = $1 ORDER BY upload_date DESC',
      [guestId]
    );

    const documents: HealthDocument[] = [];

    for (const doc of docRows.rows) {
      const valuesRes = await query(
        'SELECT * FROM extracted_health_values WHERE document_id = $1 AND guest_id = $2 ORDER BY name',
        [doc.id, guestId]
      );
      const chunksCountRes = await query(
        'SELECT COUNT(*) as count FROM document_chunks WHERE document_id = $1 AND guest_id = $2',
        [doc.id, guestId]
      );

      const extractedValues: MedicalValue[] = valuesRes.rows.map((v: any) => ({
        id: v.id,
        name: v.name,
        value: Number(v.value),
        unit: v.unit,
        referenceRange: v.reference_range ?? undefined,
        status: v.status,
        confidence: Number(v.confidence) || 1.0,
        verified: v.verified === true,
        sourceText: v.source_text ?? undefined,
      }));

      documents.push({
        id: doc.id,
        userId: doc.guest_id,
        title: doc.title,
        fileType: doc.file_type,
        fileSize: Number(doc.file_size),
        uploadDate: doc.upload_date,
        status: doc.status,
        summary: doc.summary ?? undefined,
        rawText: doc.raw_text ?? undefined,
        extractedValues,
        verified: doc.verified === true,
        chunksCount: parseInt(chunksCountRes.rows[0]?.count ?? '0', 10),
      });
    }

    res.json({ documents });
  } catch (error: any) {
    console.error('[Documents] List error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents', details: error.message });
  }
});

// ─── POST /api/documents/upload ──────────────────────────────────────────
router.post('/upload', requireGuestSession, upload.single('file'), async (req, res) => {
  const guestId = req.guest!.id;
  const docId = crypto.randomUUID();

  try {
    let rawText = '';
    let extractionMethod = 'none';
    let title = 'Health Document';
    let fileType = 'application/pdf';
    let fileSize = 0;

    if (req.file) {
      // Real file upload
      title = req.file.originalname;
      fileType = req.file.mimetype;
      fileSize = req.file.size;

      const result = await extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
      rawText = result.text;
      extractionMethod = result.method;

      if (!rawText || rawText.trim().length < 20) {
        return res.status(422).json({
          error: 'Could not extract readable text from the uploaded file.',
          details: `Extraction method "${extractionMethod}" produced insufficient text. ` +
            'Ensure the PDF contains machine-readable text or the image is clear enough for OCR.',
        });
      }
    } else if (req.body.text) {
      // Text submitted directly (from base64 or form body)
      rawText = req.body.text;
      title = req.body.title || 'Health Document';
      fileType = req.body.fileType || 'text/plain';
      fileSize = req.body.fileSize || rawText.length;
      extractionMethod = 'direct';
    } else {
      return res.status(400).json({
        error: 'No file or text provided.',
        details: 'Upload a PDF, JPG, JPEG, or PNG file using multipart/form-data with field name "file".',
      });
    }

    // 1. Insert document record (status: processing)
    await query(
      `INSERT INTO health_documents
         (id, guest_id, title, file_type, file_size, upload_date, status, summary, raw_text, verified)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'processing', NULL, $6, FALSE)`,
      [docId, guestId, title, fileType, fileSize, rawText]
    );

    // 2. Extract medical values from text
    const { extractedValues, summary } = await extractMedicalValuesFromText(rawText, docId);

    // 3. Insert extracted values
    for (const val of extractedValues) {
      await query(
        `INSERT INTO extracted_health_values
           (id, document_id, guest_id, name, value, unit, reference_range, status, confidence, verified, source_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10)`,
        [
          val.id,
          docId,
          guestId,
          val.name,
          val.value,
          val.unit,
          val.referenceRange ?? null,
          val.status,
          val.confidence,
          val.sourceText ?? null,
        ]
      );
    }

    // 4. Index chunks and generate Gemini embeddings (may throw if API unavailable)
    let chunksCount = 0;
    let ragStatus = 'ready';
    let ragNote = '';

    try {
      chunksCount = await indexDocumentChunks(docId, guestId, rawText);
    } catch (ragErr: any) {
      // RAG indexing failed — mark document as "indexed_without_rag"
      // The document is still stored; AI assistant will work but without vector search
      ragStatus = 'indexed_without_rag';
      ragNote = ragErr.message;
      console.warn('[RAG] Indexing failed for document', docId, ':', ragErr.message);
    }

    // 5. Update document status
    await query(
      `UPDATE health_documents
       SET status = $1, summary = $2
       WHERE id = $3 AND guest_id = $4`,
      [ragStatus, summary, docId, guestId]
    );

    const document: HealthDocument = {
      id: docId,
      userId: guestId,
      title,
      fileType,
      fileSize,
      uploadDate: new Date().toISOString(),
      status: ragStatus,
      summary,
      rawText,
      extractedValues,
      verified: false,
      chunksCount,
    };

    const response: any = { document, extractionMethod };
    if (ragNote) {
      response.ragNote = ragNote;
    }

    res.status(201).json(response);
  } catch (error: any) {
    // Clean up partially inserted document on error
    try {
      await query('DELETE FROM health_documents WHERE id = $1 AND guest_id = $2', [docId, guestId]);
    } catch {}

    console.error('[Documents] Upload error:', error);
    res.status(500).json({ error: 'Failed to process medical document.', details: error.message });
  }
});

// ─── PATCH /api/documents/:id/values/:valId ──────────────────────────────
router.patch('/:id/values/:valId', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const { id: docId, valId } = req.params;
  const { value, status, verified, name, unit } = req.body;

  try {
    const currentRes = await query(
      'SELECT * FROM extracted_health_values WHERE id = $1 AND document_id = $2 AND guest_id = $3',
      [valId, docId, guestId]
    );

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Medical value not found or unauthorized.' });
    }

    await query(
      `UPDATE extracted_health_values
       SET
         value = COALESCE($1, value),
         status = COALESCE($2, status),
         verified = COALESCE($3, verified),
         name = COALESCE($4, name),
         unit = COALESCE($5, unit)
       WHERE id = $6 AND document_id = $7 AND guest_id = $8`,
      [
        value !== undefined ? Number(value) : null,
        status ?? null,
        verified !== undefined ? verified : null,
        name ?? null,
        unit ?? null,
        valId,
        docId,
        guestId,
      ]
    );

    const updatedRes = await query(
      'SELECT * FROM extracted_health_values WHERE id = $1 AND guest_id = $2',
      [valId, guestId]
    );

    if (updatedRes.rows.length === 0) {
      return res.status(404).json({ error: 'Value not found after update.' });
    }

    const updated = updatedRes.rows[0];
    res.json({
      value: {
        id: updated.id,
        name: updated.name,
        value: Number(updated.value),
        unit: updated.unit,
        referenceRange: updated.reference_range,
        status: updated.status,
        confidence: updated.verified ? 1.0 : Number(updated.confidence),
        verified: updated.verified === true,
        sourceText: updated.source_text,
      },
    });
  } catch (error: any) {
    console.error('[Documents] Update value error:', error);
    res.status(500).json({ error: 'Failed to update biomarker', details: error.message });
  }
});

// ─── POST /api/documents/:id/verify ──────────────────────────────────────
router.post('/:id/verify', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const docId = req.params.id;

  try {
    const docRes = await query(
      'SELECT * FROM health_documents WHERE id = $1 AND guest_id = $2',
      [docId, guestId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    const doc = docRes.rows[0];

    await query('UPDATE health_documents SET verified = TRUE WHERE id = $1 AND guest_id = $2', [docId, guestId]);
    await query('UPDATE extracted_health_values SET verified = TRUE WHERE document_id = $1 AND guest_id = $2', [docId, guestId]);

    // Re-index with verification stamp
    if (doc.raw_text) {
      try {
        const verifiedText = `${doc.raw_text}\n\n[USER VERIFIED: All extracted values reviewed and confirmed accurate.]`;
        await indexDocumentChunks(docId, guestId, verifiedText);
        await query('UPDATE health_documents SET status = $1 WHERE id = $2 AND guest_id = $3', ['ready', docId, guestId]);
      } catch (ragErr: any) {
        console.warn('[RAG] Re-indexing on verify failed:', ragErr.message);
      }
    }

    const valuesRes = await query(
      'SELECT * FROM extracted_health_values WHERE document_id = $1 AND guest_id = $2',
      [docId, guestId]
    );
    const chunksRes = await query(
      'SELECT COUNT(*) as count FROM document_chunks WHERE document_id = $1 AND guest_id = $2',
      [docId, guestId]
    );

    const document: HealthDocument = {
      id: doc.id,
      userId: doc.guest_id,
      title: doc.title,
      fileType: doc.file_type,
      fileSize: Number(doc.file_size),
      uploadDate: doc.upload_date,
      status: 'ready',
      summary: doc.summary,
      rawText: doc.raw_text,
      extractedValues: valuesRes.rows.map((v: any) => ({
        id: v.id,
        name: v.name,
        value: Number(v.value),
        unit: v.unit,
        referenceRange: v.reference_range,
        status: v.status,
        confidence: 1.0,
        verified: true,
        sourceText: v.source_text,
      })),
      verified: true,
      chunksCount: parseInt(chunksRes.rows[0]?.count ?? '0', 10),
    };

    res.json({ document });
  } catch (error: any) {
    console.error('[Documents] Verify error:', error);
    res.status(500).json({ error: 'Failed to verify document', details: error.message });
  }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────
router.delete('/:id', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const docId = req.params.id;

  try {
    const docRes = await query(
      'SELECT id FROM health_documents WHERE id = $1 AND guest_id = $2',
      [docId, guestId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    // Cascading deletes handle chunks and embeddings (FK ON DELETE CASCADE)
    await query('DELETE FROM health_documents WHERE id = $1 AND guest_id = $2', [docId, guestId]);

    res.json({ success: true, message: 'Document and all associated data deleted.' });
  } catch (error: any) {
    console.error('[Documents] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

export default router;
