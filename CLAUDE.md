# Grid — repo guide for Claude

Gay/bi men's social + dating PWA. Read this before exploring; it should mean you rarely need to grep the tree.

## Stack & layout
- npm workspaces monorepo: `apps/web` (React 18 + Vite + Tailwind, PWA), `apps/api` (NestJS + Drizzle ORM + Postgres), `packages/shared`.
- Deploy: Render (`grid-api-h6xp.onrender.com`, `grid-web.onrender.com`), DB on Supabase (project ref `ukczzbamgfqyvnrlojsc`, pooler port 6543). GitHub `crosssquare/grid` via SSH deploy key `~/.ssh/id_ed25519_grid`.
- **`.env` lives at the repo ROOT** (`GaySoMe/.env`), not `apps/api/.env`. Its `DATABASE_URL` points at the **real production Supabase** — test accounts created locally are real rows; delete them after. Local `JWT_SECRET=change-me` differs from prod, so locally-minted tokens only verify against the local API.
- Local dev has **no Redis** — the API logs `ioredis ECONNREFUSED` spam on start. Harmless for HTTP; only sockets/presence need it.
- Signup requires `country` (ISO 3166-1 alpha-2), `dateOfBirth`, `email`, `password`, `displayName`.
- Discovery **always returns your own profile first**, regardless of filters — when testing filters/search, assert on `isSelf === false` rows.

## Frontend (`apps/web/src`)
- No router — `App.tsx` switches views by state. Bottom tabs: Timeline (home) / Grid / Chat / Profile (`NavBar.tsx`). Fixed top bar `TopBar.tsx` (Upgrade CTA + location + notification bell).
- `api.ts` — single API client + all TS interfaces (FeedPost, ViewedProfile, DiscoveryProfile, ConversationSummary, Message, Comment, etc.). **Change types here first.**
- Screens/components: `Timeline.tsx`, `DiscoveryGrid.tsx`, `ProfileView.tsx`, `ProfileForm.tsx`, `ChatView.tsx`/`ConversationList.tsx`/`ChatThread.tsx`, `NotificationsScreen.tsx`, `CommentThread.tsx` (shared post/review thread), `PendingReviews.tsx`, `ProUpgradeScreen.tsx`.
- Helpers: `presence.tsx` (`isOnline` 30-min window, `timeAgo`, `OnlineDot`), `geo.ts` (`reverseGeocode`, own location only), `UndoToast.tsx`, `Lightbox.tsx`, `FlameIcon.tsx`, `PullToRefresh.tsx`. `getMediaUrl(key)` in api.ts builds image URLs.
- Style: dark theme, `bg-slate-950/900/800`, `indigo-600` primary, `emerald-400` online. Inline SVG icons (see bell in TopBar, `FlameIcon`).

## Backend (`apps/api/src/modules/<name>`)
- Modules: auth, profiles, media, discovery, chat, taps, favorites, blocks, reports, reviews, posts, comments, notifications. Each = `*.service.ts` + `*.controller.ts` (+ dto/).
- JWT via `JwtAuthGuard` (also writes throttled `users.last_seen_at` heartbeat). DTOs use class-validator; global ValidationPipe is **whitelist** (unlisted fields silently stripped — add fields to the DTO).
- Drizzle: `apps/api/src/db/schema.ts`. Simple queries use the query builder; complex/union/aggregation use raw `sql`` `` (see `posts.service.ts listFeed`, `chat.service.ts list`/`getMessages`). Polymorphic `comments` (target_type post|review).
- `schema.sql` (root, 429 lines) is the canonical DDL, mirrored by Drizzle. **RLS is enabled + forced on all public tables** (anon/Data-API denied; backend `postgres` role bypasses). Any NEW table must get RLS or it's world-readable — see the RLS block at the end of schema.sql.

## Workflow
- Build: `npm run build --workspace=apps/api` / `--workspace=apps/web`.
- Verify UI via the Browser preview tools against a disposable test account (create → delete/cascade). HEIC screenshots: `sips -s format jpeg`.
- **Never take screenshots automatically — always ask Nathan first.** Prefer text checks (`read_page`, `read_console_messages`, API responses); images are token-heavy.
- **Never `git push` without Nathan's explicit go-ahead.** Branch off main first. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Deferred / roadmap
- Location change/hide **bottom sheet** on the top-bar pin (pin+dot shipped; sheet later).
- "Add friend"/mutual-friends system, PWA push (VAPID), real PRO payments — all deferred.
