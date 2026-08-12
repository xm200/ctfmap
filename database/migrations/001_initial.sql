-- CTFMAP initial PostgreSQL schema.
-- Store only a password hash. The API must hash the password received by
-- POST /auth/register before inserting a row into users.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('participant', 'organizer', 'admin');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE event_status AS ENUM ('active', 'draft', 'archived');
CREATE TYPE event_category AS ENUM ('elite', 'local', 'training');
CREATE TYPE event_format AS ENUM ('online', 'offline', 'hybrid');
CREATE TYPE event_difficulty AS ENUM ('Начальный', 'Средний', 'Высокий', 'Экспертный');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL,
    username_normalized TEXT GENERATED ALWAYS AS (lower(btrim(username))) STORED,
    email CITEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'participant',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    city VARCHAR(128),
    organization VARCHAR(160),
    telegram VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_username_trimmed CHECK (username = btrim(username)),
    CONSTRAINT users_username_length CHECK (char_length(username_normalized) BETWEEN 3 AND 64),
    CONSTRAINT users_email_trimmed CHECK (email::TEXT = btrim(email::TEXT)),
    CONSTRAINT users_email_not_blank CHECK (btrim(email::TEXT) <> ''),
    CONSTRAINT users_password_hash_not_blank CHECK (btrim(password_hash) <> '')
);

CREATE UNIQUE INDEX users_username_normalized_uq ON users (username_normalized);
CREATE UNIQUE INDEX users_email_normalized_uq ON users (email);

-- A refresh token is never stored in plaintext. The API looks up the hash
-- generated from the HttpOnly refresh cookie.
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    refresh_token_hash BYTEA NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_address INET,
    CONSTRAINT auth_sessions_expiry CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_active_idx
    ON auth_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status review_status NOT NULL DEFAULT 'pending',
    details TEXT NOT NULL,
    contact VARCHAR(256) NOT NULL,
    comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT verification_details_not_blank CHECK (btrim(details) <> ''),
    CONSTRAINT verification_contact_not_blank CHECK (btrim(contact) <> ''),
    CONSTRAINT verification_rejection_comment CHECK (
        status <> 'rejected' OR nullif(btrim(comment), '') IS NOT NULL
    )
);

CREATE UNIQUE INDEX verification_one_pending_per_user_uq
    ON verification_requests (user_id)
    WHERE status = 'pending';

CREATE INDEX verification_requests_queue_idx
    ON verification_requests (status, submitted_at);

-- An organizer's CTF registration is kept as a review ticket until an
-- administrator approves it and publishes an event row.
CREATE TABLE event_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID REFERENCES users (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    organizer VARCHAR(200) NOT NULL,
    contact VARCHAR(256) NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    format event_format NOT NULL,
    category event_category NOT NULL DEFAULT 'training',
    city VARCHAR(128) NOT NULL,
    region VARCHAR(128) NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL,
    status review_status NOT NULL DEFAULT 'pending',
    comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT event_submissions_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT event_submissions_organizer_not_blank CHECK (btrim(organizer) <> ''),
    CONSTRAINT event_submissions_contact_not_blank CHECK (btrim(contact) <> ''),
    CONSTRAINT event_submissions_city_not_blank CHECK (btrim(city) <> ''),
    CONSTRAINT event_submissions_region_not_blank CHECK (btrim(region) <> ''),
    CONSTRAINT event_submissions_url_not_blank CHECK (btrim(url) <> ''),
    CONSTRAINT event_submissions_description_not_blank CHECK (btrim(description) <> ''),
    CONSTRAINT event_submissions_dates CHECK (end_at >= start_at),
    CONSTRAINT event_submissions_rejection_comment CHECK (
        status <> 'rejected' OR nullif(btrim(comment), '') IS NOT NULL
    )
);

CREATE INDEX event_submissions_queue_idx
    ON event_submissions (status, submitted_at);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE REFERENCES event_submissions (id) ON DELETE SET NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    short_title VARCHAR(80) NOT NULL,
    category event_category NOT NULL,
    difficulty event_difficulty NOT NULL,
    format event_format NOT NULL,
    region_id VARCHAR(128) NOT NULL,
    city VARCHAR(128) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    rating NUMERIC(6, 2) NOT NULL DEFAULT 0,
    weight NUMERIC(6, 2) NOT NULL DEFAULT 0,
    organizer VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL,
    status event_status NOT NULL DEFAULT 'draft',
    source VARCHAR(64) NOT NULL DEFAULT 'manual',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT events_dates CHECK (end_at >= start_at),
    CONSTRAINT events_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT events_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT events_rating_nonnegative CHECK (rating >= 0),
    CONSTRAINT events_weight_nonnegative CHECK (weight >= 0)
);

CREATE INDEX events_map_idx
    ON events (status, start_at, end_at, region_id, category);

CREATE TABLE event_tags (
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    tag VARCHAR(64) NOT NULL,
    PRIMARY KEY (event_id, tag),
    CONSTRAINT event_tags_not_blank CHECK (btrim(tag) <> '')
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
