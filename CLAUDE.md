# Bug Tracker — CLAUDE.md

Personal bug tracking app built with Next.js, TypeScript, Tailwind CSS, and MongoDB.

---

## Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Framework  | Next.js 16 (App Router)       |
| Language   | TypeScript                    |
| Styling    | Tailwind CSS v4               |
| Database   | MongoDB via Mongoose          |
| Fonts      | Geist (via next/font)         |

---

## Project Structure

```
src/
  app/
    api/
      bugs/
        route.ts              # GET all bugs, POST new bug
        [id]/
          route.ts            # GET, PUT, DELETE single bug
          comments/
            route.ts          # POST new comment to a bug
    bug/
      [id]/
        page.tsx              # Bug detail page (view, edit, status, comments)
    new/
      page.tsx                # Create bug form
    globals.css               # Tailwind + dark mode config
    layout.tsx                # Root layout with ThemeToggle in header
    page.tsx                  # Homepage — bug list, filters, dashboard
  components/
    ThemeToggle.tsx           # Light/dark theme toggle (persists to localStorage)
    Toast.tsx                 # Toast notification component (ARIA-accessible)
  lib/
    mongodb.ts                # Mongoose connection with global caching
  models/
    Bug.ts                    # Mongoose Bug schema
```

---

## Bug Model

```typescript
{
  title: string           // required
  description: string     // required
  status: "open" | "in-progress" | "closed"   // default: "open"
  priority: "low" | "medium" | "high"         // default: "medium"
  dueDate?: Date          // optional
  tags: string[]          // optional, stored lowercase
  comments: [{            // embedded subdocuments
    text: string
    createdAt: Date
  }]
  createdAt: Date         // auto (timestamps: true)
  updatedAt: Date         // auto (timestamps: true)
}
```

---

## API Routes

| Method | Route                        | Description               |
|--------|------------------------------|---------------------------|
| GET    | /api/bugs                    | Fetch all bugs (newest first) |
| POST   | /api/bugs                    | Create a new bug          |
| GET    | /api/bugs/[id]               | Fetch single bug          |
| PUT    | /api/bugs/[id]               | Update bug (any fields)   |
| DELETE | /api/bugs/[id]               | Delete bug                |
| POST   | /api/bugs/[id]/comments      | Add a comment to a bug    |

Read and update routes use `.lean()` for plain JS object serialization. `POST /api/bugs` uses `.toObject()` on the created document instead, and `DELETE` returns a message string with no document serialization needed.

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

## Known Issues & Fixes Applied

### Mongoose model cache in development
`mongoose.models.Bug` persists across Next.js hot reloads because the mongoose module is cached globally. New fields added to the schema (like `tags`) get silently dropped by strict mode if the old cached model is used.

**Fix applied in `Bug.ts`:**
```typescript
if (process.env.NODE_ENV !== "production" && mongoose.models.Bug) {
    delete (mongoose.models as Record<string, unknown>).Bug;
}
```
This forces model re-registration on every hot reload in development.

### Due date timezone off-by-one
`new Date("YYYY-MM-DD")` parses as UTC midnight, which can show the wrong day in non-UTC timezones.

**Fix:** Parse date-only strings manually as local midnight:
```typescript
const getDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
};
```

### setTimeout leak in toast
`showToast` clears the previous timer using a `useRef` before scheduling a new one, and cleans up on unmount.

---

## Development Workflow

- Always create a new branch before starting features: `git checkout -b feature/name`
- Push branch and open PR on GitHub
- Copilot reviews PRs — always address feedback before merging
- After merging, pull main: `git checkout main && git pull`
- Start next feature on a fresh branch

### Branch history
| Branch | What was built |
|--------|---------------|
| `feature/bug-detail-page` | Bug detail page, status filter with badges, input text color fix |
| `feature/edit-bug` | Inline edit of title, description, priority on detail page |
| `feature/filter-badges-and-search` | Count badges on filter buttons, search bar |
| `feat/bug-tracker-improvements` | App title/description, minor code fixes |
| `feature/improvements` | Dark/light theme, dashboard, sort, priority filter, due dates, toasts, confirm on navigate |
| `feature/tags-and-comments` | Tags with filter, notes/comments on bug detail |

---

## Future Improvements (Nice to Have)

- **Keyboard shortcuts** — `n` to create bug, `/` to focus search
- **Open bug count in tab title** — e.g. `Bug Tracker (3 open)` via `document.title`
- **Export to CSV** — download all bugs as a spreadsheet
- **Reopen button** — dedicated UI when bug is closed instead of status buttons
- **Character counter on description** — show length while typing
- **Pagination** — for when the list gets long
- **Delete a comment/note** — currently notes can't be removed

---

## Coding Conventions

- Read/update API responses use `.lean()`; POST create uses `.toObject()`
- Date inputs stored as `Date` in MongoDB, formatted as `YYYY-MM-DD` in forms
- Tags are always stored lowercase
- Dark mode classes follow `bg-white dark:bg-gray-900` pattern throughout
- Status colors: red = open, yellow = in-progress, green = closed
- Priority colors: red dot = high, yellow = medium, green = low
- Tags use indigo color scheme
