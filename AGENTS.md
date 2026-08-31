# AAP Nursing — 150 Day Challenge

Nursing admission challenge app: Django + MySQL backend, Next.js frontend.

## Stack
- **Backend**: Django 5.1 + Django REST Framework + MySQL 8 (`aap_nursing` db)
- **Frontend**: Next.js 14 (App Router, plain CSS)
- **Python venv**: `/home/riyadh/aap/.venv`

## Run

### Backend (port 8000)
```bash
cd /home/riyadh/aap/backend
. ../.venv/bin/activate
python manage.py migrate
python manage.py seed_routine --reset   # load 150-day routine from CSV
python manage.py runserver 127.0.0.1:8000
```

### Frontend (port 3000)
```bash
cd /home/riyadh/aap/frontend
npm run dev
```

### API proxy (frontend → backend)
The frontend calls the backend via a **relative** `/api/*` path (NOT a hardcoded `127.0.0.1:8000` URL). Next.js proxies these requests to the Django backend through a catch-all route handler at `src/app/api/[[...path]]/route.js`. This makes the app work behind any tunnel/proxy (Cloudflare, ngrok, etc.) without CORS issues.

- Override backend URL with `BACKEND_URL` env var (default: `http://127.0.0.1:8000`)
- Override client API base with `NEXT_PUBLIC_API` env var (default: `/api`)
- The proxy auto-follows Django's trailing-slash redirects so `/api/meta` and `/api/meta/` both work
- `next.config.mjs` sets `skipTrailingSlashRedirect: true` to avoid redirect loops with Django's `APPEND_SLASH`

### MySQL
- DB: `aap_nursing`, user `aap` / pass `aap_pass_2024`
- Start: `sudo service mysql start`

## API endpoints (base: `/api`)
- `GET /api/meta/` — title, total days, phases
- `POST /api/register/` `{name, mobile}` — create/return student account
- `GET /api/student/?mobile=...` — student dashboard data (current day, progress, today's routine)
- `GET /api/routine/` — all 150 days (filter: `?phase=`, `?subject=`)
- `GET /api/routine/filters/` — available phases & subjects
- `POST /api/progress/` `{mobile, day_number, completed}` — toggle row completion

## Data source
- `নার্সিং নতুন লেকচার প্ল্যান - Sheet18.csv` — 150 days:
  - বেসিক টু এডভান্স: 100 days (Day 1-100)
  - ফাইনাল রিভিশন: 30 days (Day 101-130)
  - কুইক রিভিশন: 10 days (Day 131-140)
  - মডেল টেস্ট: 10 days (Day 141-150)

## Color codes (from aapnursing.com)
- **primary green** `#008643` (main brand), **deep green** `#01542b` (gradient end)
- **secondary red** `#fc465d`, **purple gradient** `#667eea → #764ba2`
- **lighter green** `#16a34a`, **info blue** `#3b82f6`
- **navy/ink** `#0f172a` / `#111827`, **muted** `#6b7280`

### CSS token system (`globals.css` :root)
All colors MUST use the semantic CSS custom properties defined in `:root` — never hardcode hex values in component CSS. Tokens are derived from the brand codes above:
- Brand: `--green`, `--green-dark`, `--green-2`, `--green-light`, `--green-border`, `--green-hover`, `--red`, `--red-2`, `--red-light`, `--red-border`, `--purple`, `--purple-2`, `--purple-light`, `--blue`, `--blue-2`, `--blue-light`, `--navy`, `--navy-2`, `--ink`
- Neutrals: `--bg`, `--card`, `--text`, `--muted`, `--muted-2`, `--line`, `--line-soft`, `--surface`, `--surface-2`, `--surface-3`, `--track`
- Dark sections (on navy): `--dt-text`, `--dt-muted`, `--dt-faint`, `--dt-line`, `--dt-track`
- Effects: `--shadow`, `--shadow-sm`, `--shadow-lg`, `--ease`
- Phase colors in JS data objects (`page.js`, `dashboard/page.js`) are the literal brand hex values — this is intentional (used with opacity suffixes like `${color}cc`).

## Adding resource links
Resource links (live class, question bank, exam, book) are empty by default.
Add them via Django admin or directly in the `DayRoutine` table per day.
