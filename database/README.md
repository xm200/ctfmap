# Database

PostgreSQL migrations for CTFMAP live in `migrations/` and are intended to be
run in filename order.

## Registration mapping

`POST /auth/register` accepts:

- `username` -> `users.username`
- `email` -> `users.email`
- `password` -> `users.password_hash` after server-side hashing

The database enforces case-insensitive uniqueness for both username and email.
The plaintext password must never be persisted. The frontend requires 12 to
128 characters; the API should enforce that same rule before hashing.

`auth_sessions` supports the refresh-cookie flow used by `/auth/refresh` and
`/auth/logout`. Store a cryptographic hash of the refresh token, not the token
itself.

`verification_requests` is the queue for participant profile verification and
backs `/admin/verification`. `event_submissions` is the organizer CTF intake
queue and backs `/admin/registrations`; an approved submission can produce one
row in `events`.

## Required data

The map uses the following fields from `events`:

- `start_at`, `end_at` - date and time of the competition, including timezone;
- `region_id` - region of the competition;
- `category` - `elite`, `local` or `training`.

User accounts use these fields from `users`:

- `role` - `organizer`, `participant` or `admin`;
- `email`;
- `username`;
- `password_hash` - the hash of the password, never the plaintext password.

## Local Docker

From the repository root:

```bash
docker compose up --build
```

PostgreSQL is available at `localhost:5432`, and the registration API is
available at `http://localhost:8000`. The migration runs automatically when
the PostgreSQL volume is created for the first time. To recreate the database
from scratch, run:

```bash
docker compose down -v
docker compose up --build
```

Run the frontend separately with `npm run dev`. Its Vite proxy forwards
`/api/*` to the local API, so `/register` can be tested in the browser.
