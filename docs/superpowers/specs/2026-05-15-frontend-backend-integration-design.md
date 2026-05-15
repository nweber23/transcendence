# Frontend-Backend Integration Design

**Date:** 2026-05-15  
**Scope:** Auth + Account Management  
**Status:** Approved for Implementation

---

## Overview

Connect React TypeScript frontend to existing Go/Gin backend, focusing on authentication and account management flows. Use simple custom hooks (`useAuth`, `useAccount`) to manage API calls and state, with JWT stored in localStorage.

---

## Architecture

### Stack
- **Frontend:** React 18 + TypeScript + React Router
- **Backend:** Go/Gin (already implemented)
- **Auth:** JWT tokens stored in localStorage
- **HTTP:** Fetch API with custom wrapper

### Files to Create/Modify

| File | Type | Purpose |
|------|------|---------|
| `src/utils/api.ts` | New | Fetch wrapper that auto-injects JWT token |
| `src/hooks/useAuth.ts` | New | Register, login, logout logic + token state |
| `src/hooks/useAccount.ts` | New | Account balance, transactions, deposit/withdraw |
| `src/pages/auth/Login.tsx` | Modify | Wire up login form to useAuth |
| `src/pages/auth/SignUp.tsx` | Modify | Wire up signup form to useAuth |
| `src/components/ProtectedRoute.tsx` | New | Route wrapper that checks auth, redirects to /login if missing |
| `src/pages/Account.tsx` | New | Display balance, transaction history, deposit/withdraw forms |
| `src/App.tsx` | Modify | Add ProtectedRoute wrapper, Account page route |

---

## API Contracts (from Backend)

### Authentication
```
POST /auth/register
Request: { username, email, password }
Response: { token, user_id }

POST /auth/login
Request: { username, password }
Response: { token, user_id }

POST /auth/logout
Request: (empty)
Response: success
```

### Account (Protected - requires Authorization: Bearer <token>)
```
GET /user/profile
Response: { id, username, email, created_at }

GET /user/account
Response: { id, balance, total_winnings, total_losses }

GET /user/account/transactions?limit=20&offset=0
Response: { transactions: [...], total, limit, offset }

POST /user/account/deposit
Request: { amount }
Response: { id, balance }

POST /user/account/withdraw
Request: { amount }
Response: { id, balance }
```

---

## Data Flow

### Login Flow
1. User enters username/password in Login form
2. Form calls `useAuth.login(username, password)`
3. Hook calls `POST /auth/login` via `api.ts`
4. Backend returns `{ token, user_id }`
5. Hook stores token in localStorage + React state
6. Route redirects to account dashboard or home page

### Refresh Flow
1. Page loads
2. App checks localStorage for token
3. If found, populate `useAuth.token` state (user stays logged in)
4. If not found, redirect to login

### Account Management Flow
1. User navigates to Account page
2. `useAccount.getAccount()` called on mount
3. Hook injects JWT in header: `Authorization: Bearer <token>`
4. Display balance and transaction history
5. User clicks deposit/withdraw
6. Hook calls corresponding API, updates state
7. UI reflects new balance

---

## Implementation Details

### useAuth Hook
```typescript
// Returns: { token, user, isLoading, error, login, register, logout }
// - login(username, password): authenticates user
// - register(username, email, password): creates account
// - logout(): clears token and state
// - On mount: checks localStorage for existing token
```

### useAccount Hook
```typescript
// Returns: { account, transactions, isLoading, error, getAccount, deposit, withdraw }
// - getAccount(): fetch account balance and user profile
// - deposit(amount): add funds
// - withdraw(amount): remove funds
// - Only works if useAuth.token exists (injected in headers)
```

### api.ts Wrapper
```typescript
// apiCall(method, endpoint, body?)
// - Automatically injects Authorization header with JWT token from localStorage
// - Returns parsed JSON response
// - Throws error if response status >= 400
// - Base URL from .env (e.g., http://localhost:8080)
```

### ProtectedRoute Component
```typescript
// Wraps routes that require authentication
// If useAuth.token is null:
//   - Redirect to /login
// Otherwise:
//   - Render the protected page
```

---

## State Management

**No external state library.** Keep it simple:
- `useAuth` manages auth token + user info via `useState`
- `useAccount` manages account data via `useState`
- Token persisted to localStorage for page refresh
- Each hook independently manages loading/error states

---

## Error Handling

- API errors (4xx, 5xx) throw in `api.ts`, caught in hooks
- Hooks store error in state (`useState`)
- Components display error messages to user
- Login errors (invalid credentials): show inline message
- Network errors: show "Connection failed" message
- Protected routes: on 401 error, clear token and redirect to /login

---

## Component Modifications

### Login.tsx
- Replace empty `handleSubmit` with call to `useAuth.login()`
- Show loading spinner while `isLoading`
- Display error message if `error` exists
- Redirect to account page on success

### SignUp.tsx
- Replace empty `handleSubmit` with call to `useAuth.register()`
- Show loading spinner while `isLoading`
- Display error message if `error` exists
- Redirect to login or account page on success

### Account.tsx (New)
- Display account balance from `useAccount.account.balance`
- Show recent transactions from `useAccount.transactions`
- Deposit form: input amount, call `useAccount.deposit()`
- Withdraw form: input amount, call `useAccount.withdraw()`
- Handle errors gracefully (insufficient funds, etc.)

---

## Environment Variables

Add to `.env`:
```
VITE_API_BASE_URL=http://localhost:8080
```

Used in `api.ts` for all API calls.

---

## Commits

Small, conventional commits:
- `feat: add api utility wrapper with jwt injection`
- `feat: add useAuth hook with register/login/logout`
- `feat: add useAccount hook for account operations`
- `feat: wire up login form to useAuth`
- `feat: wire up signup form to useAuth`
- `feat: add ProtectedRoute component`
- `feat: add Account page with balance and transactions`
- `feat: integrate auth state check on app load`

---

## Testing Strategy

Manual testing only (no unit tests in scope):
1. Register new account → verify JWT stored in localStorage
2. Login with existing account → verify redirect to account page
3. Refresh page → verify user still logged in (token persisted)
4. Logout → verify token cleared, redirect to login
5. Try accessing protected route without token → verify redirect to login
6. View account page → verify balance and transactions display
7. Deposit funds → verify balance updated
8. Withdraw funds → verify balance updated and error on insufficient funds
9. Network error → verify error message displays

---

## Success Criteria

- ✅ User can register and receive JWT
- ✅ User can login with credentials
- ✅ User stays logged in on page refresh
- ✅ Logout clears token and redirects to login
- ✅ Protected routes redirect to login if no token
- ✅ Account page displays balance and transactions
- ✅ Deposit/withdraw update balance in real-time
- ✅ All API errors handled gracefully with user-facing messages
