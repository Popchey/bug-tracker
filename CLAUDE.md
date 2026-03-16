# Bug Tracker — CLAUDE.md

Personal bug tracking app built with Next.js, TypeScript, Tailwind CSS, MongoDB, and NextAuth.js.

---

## Stack

| Layer          | Tech                                      |
|----------------|-------------------------------------------|
| Framework      | Next.js 16 (App Router)                   |
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
          route.ts          # NextAuth GET + POST handler
      bugs/
        route.ts            # GET all bugs, POST new bug
        [id]/
          route.ts          # GET, PUT, DELETE single bug
          comments/
            route.ts        # POST new comment to a bug
      register/
        route.ts            # POST — create new user account
    bug/
      [id]/
        page.tsx            # Bug detail page (view, edit, status, comments)
    login/
      page.tsx              # Login page (LoginForm wrapped in Suspense)
    new/
      page.tsx              # Create bug form
    register/
      page.tsx              # Register page
    globals.css             # Tailwind + dark mode config
    layout.tsx              # Root layout — Providers, ShaderBackground, header, session
    page.tsx                # Homepage — bug list, filters, dashboard
  components/
    Providers.tsx           # "use client" SessionProvider wrapper for layout
    ShaderBackground.tsx    # WebGL animated background canvas ("use client")
    SignOutButton.tsx        # "use client" sign-out button (calls signOut())
    ThemeToggle.tsx         # Light/dark theme toggle (persists to localStorage)
    Toast.tsx               # Toast notification component (ARIA-accessible)
  lib/
    auth.ts                 # NextAuth authOptions (CredentialsProvider config)
    mongodb.ts              # Mongoose connection with global caching
  middleware.ts             # Route protection — redirects unauthenticated to /login
  models/
    Bug.ts                  # Mongoose Bug schema
    User.ts                 # Mongoose User schema (email + hashed password)
```

---

## Auth Architecture

- **Strategy:** JWT sessions (no DB adapter needed — sessions live in cookies)
- **Provider:** CredentialsProvider — email + password, verified with bcrypt
- **Middleware:** `next-auth/middleware` export protects all routes except `/api/*`, `/login`, `/register`, `/_next/*`, `/favicon.ico`
- **API routes are fully excluded from middleware** — individual handlers do their own session checks if needed. This prevents unauthenticated fetch calls from receiving HTML redirects instead of JSON.
- **Session in layout:** `getServerSession(authOptions)` in the root layout (server component) provides session for the header email display and sign-out button
- **`NEXTAUTH_SECRET`** and **`NEXTAUTH_URL`** must be set in `.env.local`

### Why API routes are excluded from the middleware matcher

The middleware redirects to `/login` (HTML). If `/api/*` were included, any expired/missing session during a client-side `fetch('/api/bugs')` would return an HTML page, causing `res.json()` to throw a SyntaxError. Keeping all API routes open at the middleware level avoids this.

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
  tags: string[]            // optional, stored lowercase
  comments: [{              // embedded subdocuments
    text: string
    createdAt: Date
  }]
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

| Method | Route                        | Description                         |
|--------|------------------------------|-------------------------------------|
| GET    | /api/bugs                    | Fetch all bugs (newest first)       |
| POST   | /api/bugs                    | Create a new bug                    |
| GET    | /api/bugs/[id]               | Fetch single bug                    |
| PUT    | /api/bugs/[id]               | Update bug (any fields)             |
| DELETE | /api/bugs/[id]               | Delete bug                          |
| POST   | /api/bugs/[id]/comments      | Add a comment to a bug              |
| GET    | /api/auth/[...nextauth]      | NextAuth (signin, signout, session) |
| POST   | /api/auth/[...nextauth]      | NextAuth credentials sign-in        |
| POST   | /api/register                | Create new user account             |

Read/update routes use `.lean()` for plain JS object serialization. `POST /api/bugs` uses `.toObject()` on the created document. `DELETE` returns a message string.

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
- Notes/comments — timestamped, embedded in bug document
- Due dates — overdue bugs highlighted red on cards and detail page
- Light/dark theme toggle — persists to localStorage, no flash on load
- Toast notifications — "Status updated!", "Bug saved!", "Comment added!"
- Warn before navigating away while editing (beforeunload)
- **Login/register pages** — email + password, JWT session, bcrypt hashed
- **Full route protection** — unauthenticated users redirected to /login
- **Session email in header** + sign-out button
- **WebGL shader background** — animated plasma/line effect replacing old CSS drifting lines
- **Accessibility** — ShaderBackground respects `prefers-reduced-motion` (renders one static frame, no RAF loop)

---

## Dark Mode

Tailwind v4 class-based dark mode configured in `globals.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

The `dark` class is toggled on `<html>` by `ThemeToggle.tsx`.
An inline script in `layout.tsx` reads localStorage before first render to prevent flash of wrong theme.
`<html suppressHydrationWarning>` is required to avoid React hydration mismatch.

---

## ShaderBackground

- File: `src/components/ShaderBackground.tsx` — `"use client"`
- Uses WebGL via `canvas.getContext("webgl")`
- Vertex + fragment shaders compiled at runtime
- Animation loop via `requestAnimationFrame` — properly cancelled on unmount
- Resize listener cleaned up on unmount
- If `prefers-reduced-motion: reduce` is set, the RAF loop does not run (renders one frame at `iTime=0`)
- If WebGL is unavailable, the canvas stays transparent (no error, just no background)
- **shadcn is NOT configured in this project** — the shader component was implemented directly from provided code, not via `npx shadcn@latest add`

---

## Known Issues & Fixes Applied

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

### Middleware blocking /api/register (session bug)
The middleware initially excluded `api/auth` and `api/register` separately. But `/api/register` wasn't excluded, so unauthenticated POST requests were redirected to the HTML `/login` page. `res.json()` then threw `SyntaxError: The string did not match the expected pattern`, leaving the register button stuck on "Creating account…".

**Fix:** Exclude all `/api/*` from the middleware matcher:
```typescript
matcher: ["/((?!api|login|register|_next/static|_next/image|favicon.ico).*)"]
```

### useSearchParams() requires Suspense boundary (Next.js 14+)
`useSearchParams()` used directly in a page component causes a Next.js build error in 14+. Must be in a component wrapped with `<Suspense>`.

**Fix:** Extract `LoginForm` as a separate component and wrap in `<Suspense>` inside `LoginPage`.

### Race condition in user registration
`findOne` + `create` is not atomic — two concurrent requests can both pass the uniqueness check and both call `User.create`, with the second one throwing a Mongo duplicate key error (code 11000) as an unhandled 500.

**Fix:** Remove the `findOne` pre-check entirely. Catch the `11000` error directly on `User.create`:
```typescript
try {
    await User.create({ email, password: hashedPassword });
} catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    throw error;
}
```

### req.json() can throw on malformed bodies
`await req.json()` throws if the body is empty or not valid JSON, causing an unhandled 500. Always wrap in try/catch in API routes and return a 400.

### @types/bcryptjs in wrong dependency group
Type-only packages (`@types/*`) belong in `devDependencies`, not `dependencies`. Accidentally shipped in prod installs until corrected.

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
| `feature/tags-and-comments` | Tags with filter, notes/comments on bug detail |
| `feature/animated-background` | CSS drifting line animation + prefers-reduced-motion support (later replaced by shader) |
| `copilot/sub-pr-7` | Copilot sub-PR: CSS `--angle` custom property refactor for animated-background (merged into feature/animated-background after it was already on main — changes are moot, replaced by shader) |
| `feature/auth-and-shader` | NextAuth login/register, User model, middleware, ShaderBackground WebGL component |

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
4. **Middleware over-reach** — middleware that redirects API routes to HTML
5. **Missing Suspense** around `useSearchParams()` in Next.js 14+

---

## Coding Conventions

- Read/update API responses use `.lean()`; POST create uses `.toObject()`
- Date inputs stored as `Date` in MongoDB, formatted as `YYYY-MM-DD` in forms
- Tags are always stored lowercase
- Dark mode classes follow `bg-white dark:bg-gray-900` pattern throughout
- Status colors: red = open, yellow = in-progress, green = closed
- Priority colors: red dot = high, yellow = medium, green = low
- Tags use indigo color scheme
- Auth/UI components that call browser APIs or React hooks are `"use client"`
- Server components (layout, pages) can use `getServerSession(authOptions)` directly

---

## Future Improvements (Nice to Have)

- **Keyboard shortcuts** — `n` to create bug, `/` to focus search
- **Open bug count in tab title** — e.g. `Bug Tracker (3 open)` via `document.title`
- **Export to CSV** — download all bugs as a spreadsheet
- **Reopen button** — dedicated UI when bug is closed
- **Character counter on description** — show length while typing
- **Pagination** — for when the list gets long
- **Delete a comment/note** — currently notes can't be removed
- **Rate limiting on /api/register and login** — prevent brute-force attacks
- **User-scoped bugs** — associate bugs with the logged-in user so each user sees only their own
- **Email verification** — confirm email on register
