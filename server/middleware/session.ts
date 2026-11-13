import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';

export interface GuestContext {
  id: string;
  displayName: string;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      guest?: GuestContext;
    }
  }
}

export const COOKIE_NAME = 'healthmate_session';
const SESSION_DURATION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS || '168', 10); // 7 days

// Helper to hash token before DB lookup/storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a brand new anonymous guest user and session in PostgreSQL
 */
export async function createAnonymousGuestSession(req: Request, res: Response): Promise<GuestContext> {
  const guestId = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();
  const sessionId = crypto.randomUUID();

  // 1. Insert into guests
  await query(
    'INSERT INTO guests (id, display_name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
    [guestId, 'Guest User']
  );

  // 2. Insert into guest_sessions
  await query(
    'INSERT INTO guest_sessions (id, guest_id, session_token_hash, expires_at, created_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, NOW(), $5, $6)',
    [sessionId, guestId, tokenHash, expiresAt, req.ip || '', req.headers['user-agent'] || '']
  );

  // 3. Set secure HttpOnly cookie
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_DURATION_HOURS * 3600 * 1000,
    path: '/'
  });

  return {
    id: guestId,
    displayName: 'Guest User',
    sessionId
  };
}

/**
 * Middleware: Verifies existing guest session cookie or auto-provisions a new anonymous session.
 * Guarantees req.guest is ALWAYS populated without requiring a login screen or credentials.
 */
export async function requireGuestSession(req: Request, res: Response, next: NextFunction) {
  try {
    let rawToken = req.cookies?.[COOKIE_NAME] || (req as any).signedCookies?.[COOKIE_NAME];
    if (!rawToken && req.headers.cookie) {
      const match = req.headers.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) {
        rawToken = match[1].trim();
      }
    }

    if (rawToken && typeof rawToken === 'string' && rawToken.length >= 32) {
      const tokenHash = hashToken(rawToken);

      const sessionRes = await query(
        `SELECT s.id as session_id, s.guest_id, s.expires_at, s.revoked_at, g.display_name
         FROM guest_sessions s
         JOIN guests g ON s.guest_id = g.id
         WHERE s.session_token_hash = $1`,
        [tokenHash]
      );

      if (sessionRes.rows.length > 0) {
        const session = sessionRes.rows[0];

        // Check revocation and expiration
        const isExpired = new Date(session.expires_at) < new Date();
        const isRevoked = !!session.revoked_at;

        if (!isExpired && !isRevoked) {
          req.guest = {
            id: session.guest_id,
            displayName: session.display_name || 'Guest User',
            sessionId: session.session_id
          };
          return next();
        }
      }
    }

    // If no valid session exists, automatically provision a new anonymous guest session
    const freshGuest = await createAnonymousGuestSession(req, res);
    req.guest = freshGuest;
    return next();
  } catch (error: any) {
    console.error('Session middleware error:', error);
    return res.status(500).json({
      error: 'Session initialization error',
      details: error.message
    });
  }
}
