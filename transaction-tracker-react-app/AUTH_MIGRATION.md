# Auth Security Migration — JWT + HttpOnly Cookies

## Overview

This document describes the security improvements made to the authentication system.
The core change replaces **localStorage-based JWT storage** with **HttpOnly cookies**,
adds **automatic token rotation**, and implements **server-side logout with token blacklisting**.

---

## Why These Changes?

| Risk | Before | After |
|---|---|---|
| XSS attack steals token | JWT in `localStorage` — readable by any JS | HttpOnly cookie — JS cannot access |
| Token valid after logout | No invalidation mechanism | Server-side blacklist via `jti` |
| Token exposed in URL | JWT sent in redirect URL after Google login | Removed from URL entirely |
| Long-lived sessions | Single token, no refresh | Short-lived access token + rotating refresh token |
| Token reuse after theft | Not detected | Refresh token rotation detects reuse |

---

## Backend Changes

### 1. `JwtService.java`

**What changed:**
- Access token TTL reduced to **15 minutes** (was 5 minutes but configurable — now explicitly 15 min default)
- Every token now includes a **`jti` (JWT ID)** — a unique UUID used for blacklisting
- Added `generateRefreshToken()` — issues a 7-day refresh token with `type=refresh` claim
- Added `rotateTokens()` — validates refresh token, blacklists it, and issues a fresh token pair
- Added `isTokenExpiredOnly()` — detects expired-but-valid-signature tokens, used by filter for auto-refresh
- Added in-memory **token blacklist** (`ConcurrentHashMap<jti, expiry>`) with lazy cleanup
- Added `invalidateToken()` — blacklists a token by `jti` on logout
- Added `getClaimsIgnoringExpiry()` — extracts claims from expired tokens for blacklisting on logout

**Security properties:**
- Tokens are short-lived — window of misuse is small
- Blacklist prevents use of tokens after logout
- Refresh token rotation means each refresh token is single-use — theft is detectable

---

### 2. `CookieService.java` *(new file)*

**What changed:**
- New service to centralise all cookie operations
- `setAccessTokenCookie()` — sets 15-min HttpOnly cookie
- `setRefreshTokenCookie()` — sets 7-day HttpOnly cookie
- `clearTokenCookies()` — deletes both cookies on logout (sets Max-Age=0)
- `getAccessToken()` / `getRefreshToken()` — reads cookies from incoming requests
- All cookies set with:
  - `HttpOnly=true` — not accessible via JavaScript
  - `Secure=true` — HTTPS only (configurable for local dev)
  - `SameSite=Strict` — not sent on cross-site requests (CSRF protection)
  - `Path=/` — sent on all requests

---

### 3. `JwtAuthFilter.java`

**What changed:**
- Reads tokens from **HttpOnly cookies** instead of `Authorization` header
- **Case 1 — Valid token:** authenticates request normally
- **Case 2 — Expired token + refresh token present:** calls `rotateTokens()`, sets new cookies silently, request continues — user never sees a 401
- **Case 3 — Invalid token:** clears cookies, returns 401
- Token rotation is fully transparent — user session continues uninterrupted

---

### 4. `OAuthSuccessHandler.java`

**What changed:**
- Removed JWT from redirect URL (`?token=...`) — tokens in URLs appear in browser history, server logs, and referrer headers
- Now sets access + refresh tokens as HttpOnly cookies via `CookieService`
- Redirect URL only contains non-sensitive display info (`?name=...`)

**Before:**
```
/login-success?token=eyJhbGc...&name=John
```
**After:**
```
/login-success?name=John
```

---

### 5. `AuthController.java`

**What changed:**
- `POST /auth/login` — sets both tokens as HttpOnly cookies, returns only `{ "message": "Login successful" }`
- `POST /auth/logout` — reads tokens from cookies, blacklists both via `JwtService`, clears cookies via `CookieService`
- `GET /auth/verify` — protected endpoint; returns 200 if session cookie is valid, 401 if not. Used by frontend on page load to verify session.

---

### 6. `SecurityConfig.java`

**What changed:**
- CSRF protection **enabled** (previously disabled for stateless JWT — now required for cookie-based auth)
- Uses `CookieCsrfTokenRepository.withHttpOnlyFalse()` so frontend JS can read the CSRF token cookie
- `/auth/login` excluded from CSRF (user not yet authenticated)
- `JwtAuthFilter` registered before `UsernamePasswordAuthenticationFilter`

---

### 7. `CorsConfig.java` *(new file)*

**What changed:**
- Added explicit CORS configuration required for `credentials: "include"` on the frontend
- `allowCredentials(true)` — required for cookies to be sent cross-origin
- `allowedOrigins` set to specific frontend URL (wildcard `*` not allowed with credentials)

---

### 8. `application.properties`

**What added:**
```properties
app.jwt.expirationMillis=900000          # 15 minutes
app.jwt.refreshExpirationMillis=604800000 # 7 days
app.cookie.secure=true                   # false for local HTTP dev only
# app.cookie.domain=yourdomain.com       # uncomment for subdomain sharing
```

---

## Frontend Changes

### 1. `AuthContext.jsx`

**What changed:**
- Replaced `token` state with `user` (display name only — never store JWT in JS)
- Added `loading` state — true while `/auth/verify` is in progress
- On app load, calls `GET /auth/verify` with `credentials: "include"` to confirm session is active
- `login()` no longer accepts a token argument — reads name from `localStorage`
- `logout()` calls `POST /auth/logout` to blacklist tokens and clear cookies server-side, then clears local state
- `isAuthenticated` derived from `!!user`

---

### 2. `LoginSuccess.jsx`

**What changed:**
- Removed reading `?token=` from URL params
- Removed `localStorage.setItem("jwt", token)`
- Removed passing token to `login()`
- Now only reads `?name=` for display, calls `login()` with no arguments
- Cookies are already set by the backend before redirect — nothing to handle

---

### 3. `ProtectedRoute.jsx`

**What changed:**
- Replaced `token` check with `isAuthenticated` from context
- Added `loading` check — shows spinner while session is being verified on page refresh
- Added `replace` to `<Navigate>` to prevent back-button login loop

---

### 4. `HomeRedirect.jsx`

**What changed:**
- Removed `localStorage.getItem("jwt")` fallback check
- Added `loading` check — returns `null` while session verify is in progress
- Auth check now relies solely on `isAuthenticated` from context

---

### 5. `transactionsApi.js`

**What changed:**
- Removed `localStorage.getItem("jwt")` from every API function
- Removed `Authorization: Bearer` header from every API function
- Added shared `apiFetch()` wrapper that:
  - Adds `credentials: "include"` to every request (sends HttpOnly cookies automatically)
  - Handles 401 globally — redirects to `/login` if session has expired
  - Centralises error handling
- Fixed `uploadTransactions` — removed manual `Content-Type` header for multipart so browser sets correct boundary

---

## Token Flow Summary

```
Google Login
  → OAuthSuccessHandler sets access_token + refresh_token as HttpOnly cookies
  → Redirects to /login-success?name=John
  → Frontend stores name, marks user as authenticated

Every API Request
  → Browser sends cookies automatically (credentials: "include")
  → JwtAuthFilter reads and validates access_token cookie

Access Token Expires (15 min)
  → Filter detects expiry, reads refresh_token cookie
  → Rotates: old refresh token blacklisted, new pair issued
  → New cookies set transparently — user never sees a 401
  → Request continues normally

Logout
  → POST /auth/logout called with credentials: "include"
  → Both tokens blacklisted by jti
  → Cookies cleared (Max-Age=0)
  → Frontend clears local state, redirects to /login

Page Refresh
  → AuthContext calls GET /auth/verify
  → If cookie valid → session restored
  → If cookie expired/invalid → redirect to /login
```

---

## Security Properties Achieved

| Property | Mechanism |
|---|---|
| XSS cannot steal tokens | HttpOnly cookies — inaccessible to JavaScript |
| CSRF protection | SameSite=Strict cookies + Spring CSRF token |
| Logout invalidates tokens | Server-side blacklist by `jti` |
| Stolen refresh token detected | Single-use rotation — reuse hits blacklist |
| Short misuse window | 15-minute access token TTL |
| Tokens never in URLs | Removed from OAuth redirect |
| Tokens never in localStorage | Fully removed from frontend |

---

## Local Development Notes

- Set `app.cookie.secure=false` in `application.properties` when running on HTTP locally
- CORS `allowedOrigins` must match your frontend dev URL exactly (e.g. `http://localhost:3000`)
- Use browser DevTools → Application → Cookies to verify HttpOnly cookies are being set
- Tokens will not be visible in JS console or network response bodies — this is expected

---

## Files Changed

### Backend
- `src/main/java/com/transaction/security/JwtService.java` — updated
- `src/main/java/com/transaction/security/CookieService.java` — new
- `src/main/java/com/transaction/security/JwtAuthFilter.java` — updated
- `src/main/java/com/transaction/security/OAuthSuccessHandler.java` — updated
- `src/main/java/com/transaction/security/AuthController.java` — updated
- `src/main/java/com/transaction/security/SecurityConfig.java` — updated
- `src/main/java/com/transaction/config/CorsConfig.java` — new
- `src/main/resources/application.properties` — updated

### Frontend
- `src/auth/AuthContext.jsx` — updated
- `src/pages/LoginSuccess.jsx` — updated
- `src/auth/ProtectedRoute.jsx` — updated
- `src/pages/HomeRedirect.jsx` — updated
- `src/api/transactionsApi.js` — updated
