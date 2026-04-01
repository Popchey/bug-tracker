# Bug Tracker — CLAUDE.md

Personal bug tracking app built with Next.js, TypeScript, Tailwind CSS, MongoDB, and NextAuth.js.

---

## Stack

| Layer          | Tech                                      |
|----------------|-------------------------------------------|
| Framework      | Next.js 16.2.0 (App Router, Turbopack)    |
| Language       | TypeScript                                |
| Styling        | Tailwind CSS v4                           |
| Database       | MongoDB Atlas (free M0 tier) via Mongoose |
| Auth           | NextAuth.js v4.24.13 (credentials + JWT)  |
| Password hash  | bcryptjs (cost 12)                        |
| Fonts          | Geist (via next/font)                     |
| Background     | WebGL shader (ShaderBackground component) |

---

## Project Structure

```
src/
  app/
    api/
      auth/
        [...nextauth]/
          route.ts              # NextAuth GET + POST handler
      bugs/
        route.ts                # GET all bugs (user-scoped), POST new bug
        [id]/
          route.ts              # GET, PUT, DELETE single bug (ownership enforced on PUT/DELETE)
          comments/
            route.ts            # POST new comment to a bug
            [commentId]/
              route.ts          # DELETE a single comment
      register/
        route.ts                # POST — create new user account (rate limited)
    bug/
      [id]/
        page.tsx                # Bug detail page (view, edit, status, comments, delete note)
    login/
      page.tsx                  # Login page (LoginForm wrapped in Suspense)
    new/
      page.tsx                  # Create bug form
    register/
      page.tsx                  # Register page
    globals.css                 # Tailwind + dark mode config + drifting line animation CSS
    layout.tsx                  # Root layout — Providers, ShaderBackground, header, session
    page.tsx                    # Homepage — bug list, filters, dashboard, pagination, keyboard shortcuts
  components/
    Providers.tsx               # "use client" SessionProvider wrapper for layout
    ShaderBackground.tsx        # WebGL animated background canvas ("use client")
    SignOutButton.tsx            # "use client" sign-out button (calls signOut())
    ThemeToggle.tsx             # Light/dark theme toggle (persists to localStorage)
    Toast.tsx                   # Toast notification component (ARIA-accessible)
  lib/
    auth.ts                     # NextAuth authOptions — CredentialsProvider, JWT/session callbacks, rate limit
    mongodb.ts                  # Mongoose connection with global caching
    rateLimit.ts                # In-memory rate limiter (Map-based, per key/window)
  proxy.ts                      # Next.js 16 route protection (replaces middleware.ts)
  types/
    next-auth.d.ts              # Extends NextAuth Session + JWT types to include user.id
  models/
    Bug.ts                      # Mongoose Bug schema (includes userId for scoping)
    User.ts                     # Mongoose User schema (email + hashed password)
```

---

## Auth Architecture

- **Strategy:** JWT sessions (no DB adapter needed — sessions live in cookies)
- **Provider:** CredentialsProvider — email + password, verified with bcrypt
- **Route protection:** `src/proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`. Uses `withAuth` from `next-auth/middleware`. Protects all routes except `/api/*`, `/login`, `/register`, `/_next/*`, `/favicon.ico`
- **API routes are fully excluded from proxy matcher** — individual handlers call `getServerSession` and return 401/403 as JSON. This prevents unauthenticated fetch calls from receiving HTML redirects instead of JSON.
- **Session in layout:** `getServerSession(authOptions)` in the root layout (server component) provides session for the header email display and sign-out button
- **user.id in session:** `jwt` and `session` callbacks in `auth.ts` copy `user.id` into the JWT token and then into `session.user.id`. The types are extended in `src/types/next-auth.d.ts`.
- **`NEXTAUTH_SECRET`** and **`NEXTAUTH_URL`** must be set in `.env.local`

### Why API routes are excluded from the proxy matcher

The proxy redirects to `/login` (HTML). If `/api/*` were included, any expired/missing session during a client-side `fetch('/api/bugs')` would return an HTML page, causing `res.json()` to throw a SyntaxError. Keeping all API routes open at the proxy level avoids this.

---

## Models

### Bug

```typescript
{
  title: string             // required
  description: string       // required
  status: "open" | "in-progress" | "closed"   // default: "open"
  priority: "low" | "medium" | "high"         // default: "medium"
  dueDate?: Date            // optional
  tags?: string[]           // optional, stored lowercase, trim: true
  comments?: [{             // embedded subdocuments
    _id: ObjectId           // auto-generated, used for delete
    text: string
    createdAt: Date
  }]
  userId?: string           // owner's NextAuth user ID — all queries filter by this
  createdAt: Date           // auto (timestamps: true)
  updatedAt: Date           // auto (timestamps: true)
}
```

### User

```typescript
{
  email: string     // required, unique, lowercase, trimmed
  password: string  // bcrypt hash (cost 12)
  createdAt: Date   // auto
  updatedAt: Date   // auto
}
```

---

## API Routes

| Method | Route                                  | Description                              | Auth          |
|--------|----------------------------------------|------------------------------------------|---------------|
| GET    | /api/bugs                              | Fetch all bugs for current user          | 401 if none   |
| POST   | /api/bugs                              | Create a new bug (userId stamped)        | 401 if none   |
| GET    | /api/bugs/[id]                         | Fetch single bug                         | 401 if none   |
| PUT    | /api/bugs/[id]                         | Update bug (whitelisted fields only)     | 403 if not owner |
| DELETE | /api/bugs/[id]                         | Delete bug                               | 403 if not owner |
| POST   | /api/bugs/[id]/comments                | Add a comment to a bug                   | 401 if none   |
| DELETE | /api/bugs/[id]/comments/[commentId]    | Delete a single comment                  | 401 if none   |
| GET    | /api/auth/[...nextauth]                | NextAuth (signin, signout, session)      | —             |
| POST   | /api/auth/[...nextauth]                | NextAuth credentials sign-in             | —             |
| POST   | /api/register                          | Create new user account (rate limited)   | —             |

- Read/update routes use `.lean()` for plain JS object serialization
- `POST /api/bugs` uses `.toObject()` on the created document
- `DELETE` returns a `{ message }` string
- PUT whitelists fields: `{ title, description, status, priority, dueDate, tags }` — no update-operator injection possible

---

## Features Built

- Bug list homepage with dashboard stat cards (Total / Open / In Progress / Closed)
- Search by title (real-time, normalized with trim)
- Filter by status, priority, and tag
- Sort by newest, oldest, high priority, low priority
- Create bug form (title, description, priority, due date, tags)
- Bug detail page with inline edit (title, description, priority, due date, tags)
- Status update buttons on detail page
- Delete bug with confirmation
- Tags — indigo badges, filterable, add/remove on create and edit
- Notes/comments — timestamped, embedded in bug document, individually deletable
- Due dates — overdue bugs highlighted red on cards and detail page
- Light/dark theme toggle — persists to localStorage, no flash on load
- Toast notifications — "Status updated!", "Bug saved!", "Comment added!", "Note deleted."
- Warn before navigating away while editing (beforeunload)
- **Login/register pages** — email + password, JWT session, bcrypt hashed
- **Full route protection** — unauthenticated users redirected to /login
- **Session email in header** + sign-out button
- **User-scoped bugs** — each user only sees and can edit their own bugs
- **WebGL shader background** — animated plasma/line effect
- **Accessibility** — ShaderBackground respects `prefers-reduced-motion`; ARIA labels on remove-tag buttons; sr-only label on comment textarea
- **Open bug count in tab title** — e.g. `Bug Tracker (3 open)` updates live
- **Pagination** — 10 bugs per page, resets on filter/sort/search change
- **Keyboard shortcuts** — `n` creates new bug, `/` focuses search (hint shown in search bar)
- **Rate limiting** — 5 register attempts / 15 min per IP; 10 login attempts / 15 min per email

---

## Dark Mode

Tailwind v4 class-based dark mode configured in `globals.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

The `dark` class is toggled on `<html>` by `ThemeToggle.tsx`.
An inline script in `layout.tsx` reads localStorage before first render to prevent flash of wrong theme.
`<html suppressHydrationWarning>` is required to avoid React hydration mismatch.

Background is moved to `html` element (not `body`) so the fixed `ShaderBackground` canvas at `z-index: -1` renders correctly above it. `body` is `background: transparent`.

---

## ShaderBackground

- File: `src/components/ShaderBackground.tsx` — `"use client"`
- Uses WebGL via `canvas.getContext("webgl")`
- Vertex + fragment shaders compiled at runtime
- Animation loop via `requestAnimationFrame` — properly cancelled on unmount
- Resize listener cleaned up on unmount
- If `prefers-reduced-motion: reduce` is set, the RAF loop does not run (renders one frame at `iTime=0`)
- If WebGL is unavailable, the canvas stays transparent (no error, just no background)
- **shadcn is NOT configured in this project** — the shader component was implemented directly, not via `npx shadcn@latest add`
- Header uses frosted glass style: `bg-white/10 dark:bg-gray-900/30 backdrop-blur-md`

---

## Rate Limiting

File: `src/lib/rateLimit.ts`

Simple in-memory Map-based limiter. Resets on server restart (sufficient for personal use; production would use Redis).

```typescript
rateLimit(key: string, limit: number, windowMs: number): boolean
```

Usage:
- `/api/register`: `rateLimit("register:<ip>", 5, 15 * 60 * 1000)` — keyed by `x-forwarded-for` header
- `auth.ts` authorize: `rateLimit("login:<email>", 10, 15 * 60 * 1000)` — keyed by email
- Returns `false` → respond with 429

---

## User Scoping

All bugs have a `userId` field (string, optional in schema for backwards compatibility). All API reads/writes filter by `session.user.id`.

**Getting user.id into the session:** The `jwt` callback copies `user.id` → `token.id` on first sign-in. The `session` callback copies `token.id` → `session.user.id` on every request. Types extended in `src/types/next-auth.d.ts`.

**Ownership enforcement:**
- PUT/DELETE on a bug: fetch the bug first, compare `bug.userId === session.user.id`, return 403 if mismatch
- Old bugs without `userId` are allowed through (no userId = legacy, treated as unowned)

**Migration:** If bugs exist in MongoDB without `userId` (created before user scoping was added), they won't appear. Fix: add a temporary `GET /api/migrate-bugs` route that runs `Bug.updateMany({ userId: { $exists: false } }, { $set: { userId: session.user.id } })`. Delete the route after running it once.

---

## Known Issues & Fixes Applied

### Next.js 16: middleware.ts deprecated → proxy.ts
Next.js 16 deprecated the `middleware.ts` file convention in favour of `proxy.ts`. The old file also failed to export a recognisable function due to static analysis of re-export syntax.

**Fix:** Delete `src/middleware.ts`, create `src/proxy.ts`:
```typescript
import { withAuth } from "next-auth/middleware";
export default withAuth({ pages: { signIn: "/login" } });
export const config = { matcher: ["/((?!api|login|register|_next/static|_next/image|favicon.ico).*)"] };
```

### Mongoose model cache in development
`mongoose.models.Bug` persists across Next.js hot reloads. New fields added to the schema get silently dropped by strict mode if the old cached model is used.

**Fix applied in `Bug.ts` and `User.ts`:**
```typescript
if (process.env.NODE_ENV !== "production" && mongoose.models.Bug) {
    delete (mongoose.models as Record<string, unknown>).Bug;
}
```

### Due date timezone off-by-one
`new Date("YYYY-MM-DD")` parses as UTC midnight, showing the wrong day in non-UTC timezones.

**Fix:** Parse date-only strings manually as local midnight:
```typescript
const getDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
};
```

### setTimeout leak in toast
`showToast` clears the previous timer using a `useRef` before scheduling a new one, and cleans up on unmount.

### Middleware/proxy blocking /api/register
The matcher must exclude all `/api/*` routes. If `/api/register` is included, unauthenticated POST requests receive an HTML redirect instead of JSON, causing `res.json()` to throw `SyntaxError`.

### useSearchParams() requires Suspense boundary (Next.js 14+)
`useSearchParams()` used directly in a page component causes a Next.js build error. Must be in a component wrapped with `<Suspense>`.

**Fix:** Extract `LoginForm` as a separate component and wrap in `<Suspense>` inside `LoginPage`.

### Race condition in user registration
**Fix:** Remove `findOne` pre-check. Catch Mongo duplicate key error (code 11000) directly on `User.create` and return 409.

### req.json() can throw on malformed bodies
Always wrap in try/catch in API routes and return 400.

### API returning non-array crashes client useMemo
When the API returns `{ error: "Unauthorized" }` instead of an array, calling `.reduce()` on it crashes. **Fix:** Guard with `Array.isArray(data) ? data : []` when setting state from the API response.

### statusCounts useMemo used before declaration
React hooks must be declared in order. The `useEffect` for the tab title depends on `statusCounts`, so it must be placed *after* the `statusCounts = useMemo(...)` declaration — not before it.

### Old JWT session missing user.id after adding callbacks
After adding `jwt`/`session` callbacks to `auth.ts`, existing session cookies don't have `user.id`. Users must **log out and log back in** to get a fresh JWT with the id included.

### @types/bcryptjs in wrong dependency group
Type-only packages (`@types/*`) belong in `devDependencies`, not `dependencies`.

---

## Development Workflow

- Always check `git branch` at the start of a session — the active branch is not always main
- Always create a new branch before starting features: `git checkout main && git pull && git checkout -b feature/name`
- Push branch and open PR on GitHub
- Copilot reviews PRs — always address feedback before merging
- After merging, pull main: `git checkout main && git pull`
- Start next feature on a fresh branch

### Branch history

| Branch | What was built |
|--------|----------------|
| `feature/bug-detail-page` | Bug detail page, status filter with badges, input text color fix |
| `feature/edit-bug` | Inline edit of title, description, priority on detail page |
| `feature/filter-badges-and-search` | Count badges on filter buttons, search bar |
| `feat/bug-tracker-improvements` | App title/description, minor code fixes |
| `feature/improvements` | Dark/light theme, dashboard, sort, priority filter, due dates, toasts, confirm on navigate |
| `feature/tags-and-comments` | Tags with filter, notes/comments on bug detail, CLAUDE.md |
| `feature/animated-background` | Drifting line CSS animation (later superseded by WebGL shader) |
| `feature/auth-and-shader` | NextAuth login/register, User model, proxy, ShaderBackground WebGL |
| `fix/npm-audit-vulnerabilities` | Patched 4 npm audit vulnerabilities, pinned next to 16.2.0 |
| `feature/improvements-2` | User scoping, delete comment, tab title, pagination, rate limiting, keyboard shortcuts, proxy.ts fix |

---

## Environment Variables

```
MONGODB_URI=         # MongoDB Atlas connection string
NEXTAUTH_SECRET=     # Random base64 string — generate with: openssl rand -base64 32
NEXTAUTH_URL=        # http://localhost:3000 in dev, production URL in prod
```

All three must be present in `.env.local`. The `.gitignore` covers `.env*` so these are never committed.

---

## Copilot Review Patterns

Copilot consistently flags:
1. **Race conditions** on DB operations (findOne + create — use unique index + catch 11000 instead)
2. **Unhandled throws** from `req.json()` — always wrap in try/catch
3. **`@types/*` in dependencies** instead of devDependencies
4. **Middleware/proxy over-reach** — redirecting API routes to HTML
5. **Missing Suspense** around `useSearchParams()` in Next.js 14+
6. **Update-operator injection** in PUT routes — always whitelist fields
7. **Missing `runValidators: true`** on `findByIdAndUpdate` calls
8. **Missing ARIA labels** on icon-only buttons (remove tag ×, delete buttons)

---

## Coding Conventions

- Read/update API responses use `.lean()`; POST create uses `.toObject()`
- Date inputs stored as `Date` in MongoDB, formatted as `YYYY-MM-DD` in forms
- Tags are always stored lowercase (`trim: true`, `lowercase: true` in schema)
- Dark mode classes follow `bg-white dark:bg-gray-900` pattern throughout
- Status colors: red = open, yellow = in-progress, green = closed
- Priority colors: red dot = high, yellow = medium, green = low
- Tags use indigo color scheme
- Auth/UI components that call browser APIs or React hooks are `"use client"`
- Server components (layout, pages) can use `getServerSession(authOptions)` directly
- All API handlers check session first and return 401/403 before touching the DB
- `Array.isArray(data) ? data : []` guard when setting state from API responses

---

## Future Improvements (Nice to Have)

- **Export to CSV** — download all bugs as a spreadsheet
- **Reopen button** — dedicated UI when bug is closed
- **Character counter on description** — show length while typing
- **Email verification** — confirm email on register
- **Persistent rate limiting** — replace in-memory Map with Redis for production
- **User profile page** — change email/password
- **Bug assignment** — assign bugs to other users (requires multi-user setup)
