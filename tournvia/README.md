# Tournvia — Free Fire Esports Platform

This is a full-stack Supabase + React webapp for **Tournvia**, a Free Fire tournament platform with a public player app and a completely separate admin panel available at `/master`.

- Public app (players): `index.html` → `/`
- Admin panel (master panel): `master.html` → `/master`

Both apps are single-page React frontends that talk directly to Supabase.

## Tech stack

- **Frontend:** React + Vite + React Router + TailwindCSS
- **Backend/Auth/DB:** Supabase (database, auth, storage)
- **Auth:**
  - Players: Google OAuth via Supabase Auth (no passwords)
  - Admins: Email + password accounts created manually in Supabase
- **Email:** Designed for Nodemailer + Gmail SMTP (see env example — actual server/email sender is not implemented here)
- **Storage:** Supabase Storage (e.g., for CS / LW screenshots — wire from the results entry UI you build on top of this)

## Environments

Create a `.env` file in the project root based on `.env.example`:

```ini
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional / reserved — not used directly in this React-only template
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Contact used by the public payment buttons
VITE_WHATSAPP_NUMBER=your_whatsapp_number
VITE_TELEGRAM_USERNAME=your_telegram_username

# For the email sender service you will build around this project
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```

> **Important:** The React frontends only use the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values. The service role key must **never** be exposed to the browser — keep it for server-side scripts, edge functions, or a separate admin API layer if you add one.

## Supabase schema

Below is a suggested schema that covers all flows from the product spec. Create these tables (and RLS policies) in Supabase before running the app.

### 1. `players`

- `id` — bigint, primary key, `generated always as identity`
- `auth_id` — uuid, **unique**, references `auth.users.id`
- `ff_uid` — text, **unique** (locked after approval)
- `full_name` — text
- `phone` — text, nullable
- `email` — text (copy from auth, for convenience)
- `status` — text, enum-like: `pending` | `approved` | `rejected` | `banned` (default `pending`)
- `rejection_reason` — text, nullable
- `created_at` — timestamptz, default `now()`
- `updated_at` — timestamptz, default `now()`

**Notes:**
- On first Google login, create one `players` row linked by `auth_id`.
- UID becomes immutable after `status` transitions to `approved`.

### 2. `admins`

- `id` — bigint, primary key, identity
- `auth_id` — uuid, **unique**, references `auth.users.id`
- `email` — text
- `created_at` — timestamptz default `now()`

**Notes:**
- Admin accounts are created manually in Supabase Auth using email/password and then linked here by `auth_id`.
- RLS on admin-only tables should require `auth.uid()` to be present in `admins.auth_id`.

### 3. `tournaments`

- `id` — bigint, primary key
- `title` — text
- `type` — text: `single` | `long`
- `mode` — text: `br` | `cs` | `lw`
- `mode_label` — text (e.g. "Battle Royale")
- `format_label` — text (Solo / Duo / Squad / 4v4 / 1v1 / 2v2)
- `map` — text, nullable (BR only)
- `entry_fee` — numeric
- `max_slots` — integer
- `filled_slots` — integer, default 0
- `prize_text` — text (full description of prize distribution)
- `prize_summary` — text (short summary for list cards)
- `points_table` — text (admin-defined points table summary)
- `registration_status` — text: `open` | `closed`
- `entry_closing_time` — timestamptz, nullable
- `start_time` — timestamptz, nullable
- `youtube_live_url` — text, nullable
- `is_archived` — boolean, default false
- `tournament_password` — text (4-digit code, stored hashed if possible)
- `created_by_admin_id` — bigint, references `admins.id`
- `created_at` — timestamptz default `now()`

Indexes:
- `idx_tournaments_start_time`
- `idx_tournaments_type_mode`

### 4. `tournament_registrations`

Represents a host registering themselves (and their team) into a tournament.

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `host_player_id` — bigint, references `players.id`
- `host_uid` — text (FF UID of host, denormalized)
- `team_name` — text
- `team_members_summary` — text (comma-separated names/UIDs for quick view)
- `slot_number` — integer, nullable (slot assigned after payment confirm)
- `status` — text: `pending_payment` | `paid` | `confirmed` | `cancelled`
- `created_at` — timestamptz default `now()`

### 5. `team_members`

- `id` — bigint, primary key
- `registration_id` — bigint, references `tournament_registrations.id`
- `player_id` — bigint, references `players.id`
- `ff_uid` — text
- `status` — text: `invited` | `accepted` | `declined`
- `created_at` — timestamptz default `now()`

### 6. `payment_requests`

Used by the admin panel to confirm manual WhatsApp / Telegram payments.

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `registration_id` — bigint, references `tournament_registrations.id`
- `host_player_id` — bigint, references `players.id`
- `team_name` — text
- `team_members_summary` — text
- `status` — text: `pending` | `confirmed` | `rejected`
- `created_at` — timestamptz default `now()`

### 7. `long_brackets`

High-level record for a long knockout tournament (CS / LW).

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `current_round` — integer, default 1
- `created_at` — timestamptz default `now()`

### 8. `long_br_matches`

Individual matches in a knockout bracket.

- `id` — bigint, primary key
- `bracket_id` — bigint, references `long_brackets.id`
- `round_number` — integer (1, 2, 3, ...)
- `match_number` — integer within round
- `team_a_registration_id` — bigint, references `tournament_registrations.id`
- `team_b_registration_id` — bigint, references `tournament_registrations.id`
- `winner_registration_id` — bigint, nullable, references `tournament_registrations.id`
- `created_at` — timestamptz default `now()`

### 9. `long_br_standings` (for long BR points system)

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `registration_id` — bigint, references `tournament_registrations.id`
- `total_points` — numeric, default 0
- `created_at` — timestamptz default `now()`

### 10. `long_br_match_results`

Stores raw data per match so points can be recalculated.

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `registration_id` — bigint, references `tournament_registrations.id`
- `match_index` — integer (1, 2, 3...)
- `kills` — integer
- `position` — integer
- `points` — numeric ( `(kills + 1) / position * 100` )
- `created_at` — timestamptz default `now()`

### 11. `single_match_results`

For single BR / CS / LW tournaments.

- `id` — bigint, primary key
- `tournament_id` — bigint, references `tournaments.id`
- `registration_id` — bigint, references `tournament_registrations.id`
- `mode` — text: `br` | `cs` | `lw`
- **BR fields:**
  - `kills` — integer
  - `position` — integer
- **CS/LW fields:**
  - `result_text` — text
  - `screenshot_url` — text, nullable (Supabase Storage)
- `created_at` — timestamptz default `now()`

### 12. `name_change_requests`

- `id` — bigint, primary key
- `player_id` — bigint, references `players.id`
- `current_name` — text
- `requested_name` — text
- `status` — text: `pending` | `approved` | `rejected`
- `admin_reason` — text, nullable
- `created_at` — timestamptz default `now()`

### 13. `notifications`

- `id` — bigint, primary key
- `player_id` — bigint, references `players.id`
- `title` — text
- `body` — text
- `type` — text (e.g. `account`, `payment`, `tournament`)
- `is_read` — boolean default false
- `created_at` — timestamptz default `now()`

### 14. `contact_messages`

Used by the public contact / feedback page.

- `id` — bigint, primary key
- `category` — text (Bug Report, Complaint, Feedback, Other)
- `name` — text
- `email` — text
- `message` — text
- `is_reviewed` — boolean default false
- `created_at` — timestamptz default `now()`

### 15. `bans`

- `id` — bigint, primary key
- `player_id` — bigint, references `players.id`
- `tournament_id` — bigint, nullable, references `tournaments.id`
- `scope` — text: `match` | `tournament` | `global`
- `reason` — text
- `expires_at` — timestamptz (e.g. now() + interval '3 days')
- `created_at` — timestamptz default `now()`

---

## RLS (Row Level Security) notes

High-level strategy (configure in Supabase):

- `players` — players can `select` their own row and insert/update their profile; admins can read/update all.
- `tournaments` — public `select` for everyone; insert/update/delete restricted to admins.
- `tournament_registrations` / `team_members` / `payment_requests` — players can insert rows related to themselves; admins can read/update all.
- `long_br_*` and `single_match_results` — read for everyone, write only for admins.
- `name_change_requests` — players can insert for themselves; admins review.
- `notifications` — players can read their own notifications.
- `contact_messages` — insert for anyone; read/update for admins.
- `bans` — admins only.

Use the `admins` table in combination with `auth.uid()` to gate admin access.

---

## Running locally

```bash
npm install
npm run dev
```

- Public app: open the dev URL root (`/`).
- Admin panel: navigate directly to `/master` (e.g. `http://localhost:5173/master`).

> The admin panel has no link from the public app; it is a completely separate entry point available only at the `/master` path.

---

## What is wired vs. placeholder

This template gives you clean, production-ready structure that follows the Tournvia spec:

- Google login for players and profile shell
- Separate admin auth session and master panel at `/master`
- Tournament listing, details cards, basic registration and payment request structures
- Contact / feedback form wired to `contact_messages`
- Admin dashboard with key stats, player approvals, tournament CRUD skeleton, payment confirmations, and complaints review

The more advanced flows (full bracket rendering, screenshot uploads, email notifications with Nodemailer, automatic BR points recalculation, full teammate invite UI) are **documented** and partially surfaced in the UI but intentionally left for you to wire exactly how you want once the schema is created and tested in Supabase.

This keeps the codebase clean while giving you a strong, expandable foundation.
