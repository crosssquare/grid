-- ============================================================
-- Grid — Core Database Schema (PostgreSQL 16+, PostGIS enabled)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- Users & Auth ----------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT UNIQUE NOT NULL,
    password_hash       TEXT,                          -- null if passkey-only
    email_verified_at   TIMESTAMPTZ,
    date_of_birth       DATE,                          -- captured at signup; 18+ enforced at signup time.
                                                         -- Nullable only because it predates existing Phase 0
                                                         -- alpha accounts — required going forward.
    country             TEXT NOT NULL,                  -- ISO 3166-1 alpha-2, e.g. 'DE','GB'
    locale              TEXT NOT NULL DEFAULT 'en',
    account_status      TEXT NOT NULL DEFAULT 'active', -- active | suspended | soft_deleted | hard_deleted
    soft_deleted_at     TIMESTAMPTZ,
    founding_member     BOOLEAN NOT NULL DEFAULT false, -- grandfathered free PRO, permanent
    referral_invites_remaining SMALLINT NOT NULL DEFAULT 0, -- only >0 for organic founding members; referred users get 0
    referred_by_user_id UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_invites (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code       TEXT UNIQUE NOT NULL,
    redeemed_by_user_id UUID REFERENCES users(id),
    redeemed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- App-layer rule: redeeming an invite sets redeemed_by_user_id.founding_member-equivalent free-PRO
-- flag (via a permanent, non-expiring subscription override), but referral_invites_remaining stays 0
-- for the redeemer — referral rights do not chain beyond the original founding cohort.

CREATE TABLE devices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token    TEXT,                -- Web Push subscription
    fingerprint   TEXT,                -- device fingerprint, for anti-spam/ban-evasion
    last_seen_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Age & Identity Verification (compliance-critical) ----------
CREATE TABLE age_verifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,             -- e.g. 'yoti','veriff','kid'
    provider_ref      TEXT NOT NULL,             -- vendor's opaque reference — never store raw ID/biometrics
    result            TEXT NOT NULL,             -- pass | fail | pending
    method            TEXT NOT NULL,             -- facial_estimation | id_document | open_banking | digital_id
    verified_at       TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,               -- re-verification cadence
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photo_verifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'unverified', -- unverified | pending | verified | rejected
    selfie_media_id UUID,                              -- transient, purge after match
    review_method TEXT NOT NULL DEFAULT 'manual',       -- manual | ai_assisted | automated — starts manual at MVP volume
    reviewed_by_staff_id UUID REFERENCES users(id),     -- set when review_method = 'manual'; null once automated
    verified_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE peer_verifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vouching_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vouch_message    TEXT,               -- optional short message accompanying the vouch
    vouched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at       TIMESTAMPTZ,        -- set automatically if vouching_user later blocks subject_user
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subject_user_id, vouching_user_id)
);
-- App-layer rule: a vouch is only valid (counts toward badge tier) while revoked_at IS NULL.
-- When vouching_user_id blocks subject_user_id (see blocks table), set revoked_at automatically
-- and re-evaluate subject_user's verified_badge_tier.

-- ---------- Profiles ----------
CREATE TABLE profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name        TEXT NOT NULL,
    bio                 TEXT,
    role                TEXT,          -- top | more_top | vers | bottom | more_bottom
    body_type           TEXT,          -- slim | athletic | stocky | muscular | average
    height_cm           SMALLINT,
    weight_kg           SMALLINT,
    -- age is intentionally not stored here — computed from users.date_of_birth so it can
    -- never go stale or be self-reported inaccurately.
    health_status        TEXT,          -- user-entered, optional, encrypted at column level
    prep_status         TEXT,          -- user-entered, optional, encrypted at column level
    chems_preference    TEXT,          -- user-entered, optional
    size                TEXT,          -- s | m | l | xl | xxl — resolves the size_cm TBD note; categorical, not cm
    smoker              BOOLEAN,       -- user-entered, optional
    dirty_preference    TEXT,          -- dirty | not_dirty | ws_only
    fisting_preference  TEXT,          -- ff_active | ff_passive | ff_vers | no_ff
    contact_info         TEXT,          -- user-entered, optional (e.g. Telegram/Snapchat handle); subject to the same per-field privacy toggle as other profile fields
    location            GEOGRAPHY(Point, 4326),
    location_shared     BOOLEAN NOT NULL DEFAULT false,
    location_precision  TEXT NOT NULL DEFAULT 'fuzzed', -- fuzzed | exact (opt-in only)
    visibility          TEXT NOT NULL DEFAULT 'public',  -- public | registered_only | hidden
    hide_from_search_engines BOOLEAN NOT NULL DEFAULT true,
    notify_on_profile_view BOOLEAN NOT NULL DEFAULT true, -- false = incognito browsing (view others without notifying them)
    online_status       TEXT NOT NULL DEFAULT 'offline',
    last_active_at      TIMESTAMPTZ,   -- powers "last active" display; member-since comes from users.created_at
    verified_badge_tier SMALLINT NOT NULL DEFAULT 0,     -- 0 none / 1 photo / 2 peer-verified
    profile_photo_media_id UUID, -- user-selected primary photo (FK to media.id added below, media is defined later)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_location ON profiles USING GIST (location);

-- Note: health_status / prep_status stored in a column-encrypted form (pgcrypto pgp_sym_encrypt
-- at the application layer, or a dedicated KMS-backed field) — never included in bulk exports
-- to third parties, never used for any ranking/ad logic (there are no ads).

CREATE TABLE hashtags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag   CITEXT UNIQUE NOT NULL
);
CREATE TABLE profile_hashtags (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hashtag_id  UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, hashtag_id)
);

-- ---------- Media ----------
CREATE TABLE media (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_type        TEXT NOT NULL,     -- photo | video
    storage_key       TEXT NOT NULL,     -- S3 object key
    is_explicit       BOOLEAN NOT NULL DEFAULT false,
    visibility        TEXT NOT NULL DEFAULT 'private', -- public | private_album | chat_only
    moderation_status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | csam_flagged
    hash_scan_result  TEXT,              -- result of CSAM hash-match scan, run pre-publish, mandatory
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Hard constraint at application layer: media.visibility can never resolve to 'public'
-- unless moderation_status = 'approved' AND (is_explicit = false OR viewer has passed age_verifications).

ALTER TABLE profiles ADD CONSTRAINT profiles_profile_photo_media_id_fkey
    FOREIGN KEY (profile_photo_media_id) REFERENCES media(id) ON DELETE SET NULL;

CREATE TABLE media_likes (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id      UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, media_id)
);
-- Liking a specific photo — distinct from `taps` (a lightweight per-user "interested in
-- messaging" signal surfaced in Chat). A like generates a Timeline activity entry
-- ("X liked [owner]'s photo"), same as an approved+public review does.

-- ---------- Social Graph ----------
CREATE TABLE favorites (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, favorite_id)
);
-- App-layer rule: free-tier users are capped at a standing total count (e.g. 25) — enforce via a
-- COUNT(*) check against this table at insert time, not a time-windowed Redis counter, since this
-- is a total-holdings limit rather than a daily-usage limit.

CREATE TABLE blocks (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, blocked_id)
);
-- App-layer rule: a block hides all previously exchanged messages/media between the two users,
-- for both parties, going forward — not just future contact. Also triggers revocation of any
-- peer_verifications vouch between the two (see peer_verifications.revoked_at).

CREATE TABLE profile_views (
    viewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visible_to_viewed BOOLEAN NOT NULL, -- snapshot of viewer's notify_on_profile_view setting AT THE TIME of this view;
                                        -- don't recompute from the live profile setting, or a later toggle would
                                        -- retroactively change past view history
    viewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- App-layer rule: the "Viewed Me" list only shows rows where visible_to_viewed = true.
-- Incognito viewers still generate a row (for potential moderation/report use), it's just
-- never surfaced to the viewed user.

-- ---------- Communication ----------
CREATE TABLE taps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'request', -- request | active | archived | expired
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_a_id, user_b_id)
);
-- Scheduled job: any conversation with status = 'request' and last_message_at older than 7 days
-- with no reply from the recipient transitions to 'expired' and drops off the requests list.
-- This is an inbox-hygiene state change, not a deletion — messages remain in the DB per the
-- standard retention policy, so a later report/moderation review is still possible.
CREATE INDEX idx_conversations_request_expiry ON conversations (status, last_message_at)
    WHERE status = 'request';

CREATE TABLE messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body             TEXT,
    media_id         UUID REFERENCES media(id),
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_reactions (
    message_id    UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji         TEXT NOT NULL, -- charm-bar set: 🔥 | 🐷
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);
-- One reaction per user per message — picking a different emoji replaces the previous one
-- (upsert on the PK), it does not stack.

-- ---------- Meet Reviews ----------
-- Gate: either party can flag a conversation as a confirmed real-world meetup.
-- Reviewing is only permitted once a meet_confirmation exists between the two users.
CREATE TABLE meet_confirmations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    confirmed_by_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    other_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, confirmed_by_id)
);

CREATE TABLE reviews (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meet_confirmation_id UUID NOT NULL REFERENCES meet_confirmations(id) ON DELETE CASCADE,
    reviewer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating             SMALLINT CHECK (rating BETWEEN 1 AND 5),
    body               TEXT,
    status             TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | removed_by_moderation
    visibility         TEXT NOT NULL DEFAULT 'private',  -- public | private — set by reviewee only, at approval time
    reviewer_anonymized_publicly BOOLEAN NOT NULL DEFAULT true, -- if true, public viewers see review w/o reviewer identity
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at         TIMESTAMPTZ,       -- when reviewee approved/rejected
    UNIQUE (reviewer_id, reviewee_id, meet_confirmation_id)
);
-- App-layer rule: a review row is only ever readable by (a) the reviewee, always,
-- and (b) the public, only if status = 'approved' AND visibility = 'public'.
-- Rejected reviews are hard-deleted on rejection, not just status-flagged, per retention policy.

CREATE TABLE review_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id     UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason_code   TEXT NOT NULL,  -- harassment | defamation | false_content | personal_info | other
    status        TEXT NOT NULL DEFAULT 'open',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_likes (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id     UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, review_id)
);
-- Flame-likes on a review's Timeline activity entry. Only meaningful for reviews that are
-- approved + public (the only ones that surface anywhere likeable).

-- ---------- Community: Timeline, Events, Classifieds ----------
-- Note: feed_posts is the single shared public Timeline (the app's home tab).
-- There is no per-user personal timeline — a user's posts only ever live on
-- this one shared stream, queried/filtered by author when needed (e.g. for
-- moderation), never surfaced as a standalone feature on someone's profile.
CREATE TABLE feed_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT,
    media_id      UUID REFERENCES media(id), -- legacy single-photo column; post_media is the source of truth
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- A user's latest feed_posts.body doubles as their profile "status" line (text only —
-- attached photos are not copied to the profile status display).

CREATE TABLE post_media (
    post_id       UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    media_id      UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position      SMALLINT NOT NULL DEFAULT 0, -- display order within the post
    PRIMARY KEY (post_id, media_id)
);
-- Multi-photo attachments for a Timeline post. Existing single-photo posts were backfilled
-- here (position 0); new posts write here only, feed queries read from here only.

CREATE TABLE comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type   TEXT NOT NULL CHECK (target_type IN ('post', 'review')),
    target_id     UUID NOT NULL, -- feed_posts.id or reviews.id depending on target_type
    body          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_target_idx ON comments (target_type, target_id, created_at);
-- Flat comment threads on Timeline posts (incl. photo posts) and on reviews. Review comments
-- also surface under the same review on the reviewee's profile — one thread, two surfaces.
-- No FK on target_id (polymorphic); orphan cleanup is handled at the app layer on delete.

CREATE TABLE events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT,
    venue_name     TEXT,
    location       GEOGRAPHY(Point, 4326),
    starts_at      TIMESTAMPTZ NOT NULL,
    ends_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_attendees (
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Joining an event is a Timeline activity, so the join needs its own timestamp
    -- to order by; the event's created_at is when it was made, not when you joined.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE classifieds (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body           TEXT NOT NULL,
    anonymous      BOOLEAN NOT NULL DEFAULT false,
    available_from TIMESTAMPTZ,
    available_to   TIMESTAMPTZ,
    location       GEOGRAPHY(Point, 4326),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Trust & Safety ----------
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason_code     TEXT NOT NULL,   -- fake_profile | underage_concern | harassment | spam | illegal_content | csam
    detail          TEXT,
    status          TEXT NOT NULL DEFAULT 'open', -- open | reviewing | actioned | dismissed
    escalated       BOOLEAN NOT NULL DEFAULT false, -- true for csam/underage — auto-suspends subject account
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

-- ---------- Monetization ----------
-- Processor-agnostic by design: MVP runs on Stripe, but no Stripe-specific naming here,
-- so migrating to an adult-specialist processor (CCBill/Segpay/Epoch) is a config swap.
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_provider        TEXT NOT NULL,   -- 'stripe' | 'ccbill' | 'segpay' | 'epoch' etc.
    provider_customer_id    TEXT NOT NULL,
    provider_subscription_id TEXT NOT NULL,
    plan                    TEXT NOT NULL,   -- pro_monthly | pro_annual
    status                  TEXT NOT NULL,   -- active | past_due | canceled
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- GDPR / Consent ----------
CREATE TABLE consent_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type  TEXT NOT NULL,   -- cookies_analytics | cookies_marketing | terms_v1 | privacy_v1 | health_data_processing
    granted       BOOLEAN NOT NULL,
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE data_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type  TEXT NOT NULL,   -- export | delete | rectify | restrict
    status        TEXT NOT NULL DEFAULT 'pending',
    fulfilled_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Row-Level Security ----------
-- Supabase exposes every table in `public` through its PostgREST Data API, authenticated
-- only by the anon key — which is public by design. RLS is therefore the sole boundary
-- protecting that path, and this app stores highly sensitive data (health status, sexual
-- preferences, precise location, private photos, DMs).
--
-- The API server does NOT use PostgREST or the anon key: it connects directly to Postgres
-- as `postgres`, which owns these tables and holds BYPASSRLS. So enabling RLS with NO
-- policies is deliberate — it denies the anon/Data API path entirely while the backend,
-- which enforces all access control in application code, is unaffected.
--
-- Consequence: any NEW table added to `public` must get these two statements too, or it
-- silently becomes world-readable via the Data API. FORCE is belt-and-braces for the case
-- where a future owner role lacks BYPASSRLS.
--
-- spatial_ref_sys is intentionally excluded: it is a PostGIS system table owned by
-- supabase_admin (not ours to alter) and holds only public reference data.
DO $$
DECLARE t text;
BEGIN
    FOR t IN
        SELECT c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'spatial_ref_sys'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;
