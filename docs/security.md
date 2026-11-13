# Security, Authentication & Data Privacy Architecture

## 1. Authentication Security Standards

HealthMate AI strictly rejects all legacy development bypasses and enforces cryptographic token validation:

### Prohibited Authentication Schemes (Strictly Rejected)
- Fabricated tokens (`guest-session-<uid>`)
- Hardcoded tokens (`demo-academic-token`, `demo-session-*`)
- Client-supplied UIDs in request bodies or query parameters
- Expired tokens or malformed JWT structures
- Plaintext API key exposure to the browser

### Verified Authentication Mechanism
1. Client requests Firebase Anonymous authentication via `signInAnonymously(auth)`.
2. The Firebase ID token is retrieved and attached to every API request via the `Authorization: Bearer <token>` header.
3. The server middleware (`requireAuth`) inspects the token:
   - Validates three-part JWT segment structure.
   - Verifies expiration claim (`exp > current_unix_timestamp`).
   - Extracts subject `sub` (Firebase UID).
   - Never trusts client-supplied UIDs.

---

## 2. Administrator Authorization (Fail-Closed)

- **Server-Side Allowlist:** Admin rights are managed strictly through `process.env.ADMIN_UID_ALLOWLIST` (comma-separated list of trusted UIDs).
- **Fail-Closed Default:** If `ADMIN_UID_ALLOWLIST` is undefined, empty, or missing, administrative endpoints (`requireAdmin`) immediately return **403 Forbidden**.
- **Anonymous Guest Exclusion:** Anonymous guest sessions are categorically forbidden from possessing administrative privileges.

---

## 3. Cryptographic Guest Data Deletion & Reset

To guarantee guest privacy, the application provides a zero-leakage reset feature:

1. User clicks **Reset Guest Data** and reviews the confirmation modal.
2. The client submits `POST /api/user/reset` accompanied by the verified Bearer token.
3. The server executes a batched database transaction:
   - Deletes all user documents, chunks, and embeddings.
   - Deletes all extracted biomarkers.
   - Deletes all health measurements and habits.
   - Deletes all chat history, memory records, and audit logs.
4. Only upon server confirmation of full purge does the client invoke `signOut(auth)` and provision a fresh anonymous guest session.

---

## 4. Prompt Injection & Input Hardening

Uploaded medical documents represent untrusted external text. To protect against malicious instructions embedded in clinical PDFs:
1. Document text is encapsulated within strict XML boundaries (`<UNTRUSTED_PATIENT_DOCUMENT>`).
2. The system instruction informs Gemini that content within the boundary represents raw data, not system commands.
3. File uploads are validated: file types restricted to `.pdf`, `.png`, `.jpg`, `.txt`, and size capped at 10MB.
