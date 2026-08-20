# Fastify web authentication

Browser login posts the Firebase ID token to `POST /api/v1/auth/session`. The
Fastify service verifies the token, creates the API-owned secure session cookie,
and issues a separate readable CSRF cookie. Next.js SSR requests forward those
cookies to the private Fastify base URL. Browser mutations must send the CSRF
cookie value as `X-CSRF-Token` and pass the configured same-origin check.

Flutter and other external clients continue to send a Firebase ID token as
`Authorization: Bearer <token>` and use `X-Campus-Id` when switching between
authorized campuses. No web-specific bearer bridge is accepted.

`POST /api/v1/auth/logout` revokes the active API session and clears the session,
campus, and CSRF cookies. `POST /api/v1/auth/campus` changes the active campus
only after the server confirms that the campus is in the authenticated user's
scope.

Native clients call bearer-authenticated `POST /api/v1/auth/revoke` before local
sign-out. The API revokes the authenticated Firebase user's refresh tokens and
writes an audit event; the client must still clear its local Firebase session if
the network is unavailable.
