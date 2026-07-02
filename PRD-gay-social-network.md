# Product Requirements Document
## Project Codename: "Grid" — A Social Network for Gay & Bi Men
### Mobile Web App (PWA) — Build Spec for Claude Code

**Version:** 1.0
**Date:** July 2026
**Status:** Draft for engineering kickoff

---

## 1. Executive Summary

Grid merges the two strongest ideas in the gay social/dating category today:

- **Buddy's** energy: fast, kinky-friendly, ad-free, feature-rich for free, with strong discovery (hashtags, filters, favorites) and a genuinely useful **events/classifieds** layer.
- **FabGuys'** discipline: mature **trust & safety** stack (peer-to-peer verification, photo verification, age verification, anti-spam), a real **GDPR self-service** posture, and a clean **social/community** layer (Timeline, hotlist, "want to meet today").

The result is a single product: **free-to-use, ad-free, judgment-free**, monetized through an optional "PRO/Supporter" subscription, built as a mobile web PWA so it installs like an app without App Store review friction — no native app is planned.

---

## 2. Positioning

**One-liner:** A fast, free, ad-free social and dating app for gay and bi men — real profiles, real verification, real events, zero judgment.

**Differentiators vs. incumbents:**
1. No ads, no paywalled safety or discovery features — usage limits exist only on high-volume, low-stakes actions (see Monetization Model)
2. Actual identity trust layer via peer verification + photo verification (matches FabGuys, which most kink-forward apps skip)
3. A genuine local **events & classifieds** calendar, not just a grid of profiles
4. Community layer (Timeline, hashtags, hotlist) so the app has a reason to open outside of "looking for now"
5. GDPR-first from day one — self-service data export/delete, granular consent, not bolted on later

---

## 3. Target Audience

Adult (18+) gay and bisexual men, initial launch markets **UK, Ireland, Germany, Netherlands, Australia, Canada** (English + German interface at launch, matching FabGuys' country model and Buddy's language list). Two overlapping user intents to design for simultaneously:
- **Now/nearby**: fast, low-friction cruising and chat (Buddy's core loop)
- **Community/ongoing**: browsing profiles, events, classifieds, hashtag interests, favorites over time (FabGuys' retention loop)

---

## 4. Information Architecture

**Two separate surfaces:** a public marketing site (logged-out, crawlable, SFW — see §5.10) and the authenticated app (behind signup, PWA shell, where all explicit content lives). The tree below is the authenticated app; the marketing site is a handful of standalone pages (home, safety, pricing, legal) that link into the app's signup flow.

```
Root (Bottom Tab Bar — 5 tabs, Timeline is the default/opening tab)
├── Timeline (Home) — the single shared public activity stream, everyone's
│   │  posts in one place; this is what opens first, not the Grid
│   ├── Public activity feed (photo uploads, status posts, check-ins)
│   └── Post composer
├── Grid (Discovery)
│   ├── Nearby grid (GPS distance-sorted)
│   ├── New Users
│   ├── Online Now filter
│   ├── Advanced Filters (role, body type, age, height, weight,
│   │                      chems, HIV/health status, PrEP, TASP)
│   ├── Hashtag Search
│   └── User Profile (viewed) — reached by tapping any grid card, timeline
│       post, favorite, or reviewer; also the target of shared profile links.
│       No personal timeline here — a user's activity only ever lives on the
│       one shared Timeline tab, not duplicated onto their own profile.
│       ├── Photo gallery (public albums; explicit media blurred, tap-to-reveal)
│       ├── Video (if uploaded — public or unlock-in-chat per uploader's setting)
│       ├── Bio, stats, role, tags, size, HIV/health status, PrEP, contact info
│       │   (each field only shown if the profile owner set it to public)
│       ├── Verification badges (photo-verified, peer-verified)
│       ├── "Member since" / "last active"
│       ├── Public reviews (approved + set to public by the reviewee only)
│       ├── Actions: Tap · Message · Favorite · Report · Block · "We Met"
│       └── Respects viewer's incognito setting (§5.2) — may or may not notify
│           the profile owner that they were viewed, per the viewer's preference
├── Chat
│   ├── Taps (lightweight interest signal)
│   ├── Conversations (text/photo/video)
│   └── Message requests / blocked
├── Events & Classifieds
│   ├── Local classifieds ("what you want and when," anonymous option)
│   ├── Group events (buddy-created)
│   ├── Venue guide (clubs, saunas, cruise spots)
│   └── "Want to Meet Today" board
└── Profile / Me
    ├── My Profile (edit)
    ├── Favorites / Hotlist
    ├── Viewed Me
    ├── Reviews (received: approve/reject, public/private toggle · given)
    ├── Verification Center (photo + peer verification)
    ├── Privacy & Anonymity Controls
    ├── Notification Settings
    ├── Subscription (Grid PRO)
    ├── Language / Country
    ├── Help, Report, Block list
    ├── Data & Privacy (GDPR portal)
    └── Delete Account
```

---

## 5. Merged Feature Set

Legend: **[MVP]** ship in v1 · **[V1.1]** fast-follow · **[V2]** later

### 5.1 Onboarding, Identity & Trust *(new backbone — FabGuys-led)*
| Feature | Source | Priority |
|---|---|---|
| Age verification (18+) at signup, ID or card-based | FabGuys | MVP |
| Email verification, opt-in notification preferences | FabGuys | MVP |
| Photo verification (pose-matching selfie vs. profile photo, green flag badge) — reviewed manually by the founder at low volume, moving to AI-assisted/automated as volume grows | FabGuys | MVP |
| Peer-to-peer verification network (verified users vouch for others via an in-app message exchange — no call required) | FabGuys | V1.1 |
| Anti-spam onboarding (CAPTCHA-equivalent, rate limits on new-account messaging) | FabGuys | MVP |

### 5.2 Profile
| Feature | Source | Priority |
|---|---|---|
| Photo gallery, public + private/friends-only albums | Both (merged) | MVP |
| Prerecorded video upload, public or unlock-in-chat | Buddy | V1.1 |
| Body stats, role, tags, size, HIV/health status, PrEP/TASP, contact info fields | Both (merged) | MVP |
| Per-field privacy toggle (public / registered users / hidden) | FabGuys | MVP |
| Username change (supporter perk) | FabGuys | V1.1 |
| "Member since" + "last active" display | FabGuys | MVP |
| Incognito browsing — opt out of notifying others when you view their profile | FabGuys | MVP |
| **View another user's profile page** — full gallery, video, bio/stats/tags respecting each field's privacy setting, verification badges, public reviews, and action buttons (Tap/Message/Favorite/Report/Block/We Met); reached from the grid, feed, favorites, or a shared link | Both (merged) | MVP |

### 5.3 Discovery
| Feature | Source | Priority |
|---|---|---|
| Nearby grid, GPS distance-sorted, optional location sharing | Both (merged) | MVP |
| Advanced filters (online, photo/video presence, role, age, height, weight, body type, size, chems, HIV status, PrEP) — first pass, to be refined | Buddy | MVP |
| Hashtag search | Buddy | MVP |
| New Users tab | Buddy | MVP |
| Local search by postcode/country/region drill-down | FabGuys | V1.1 |
| Favorites / Hotlist with "online now" sub-view | Both (merged) | MVP |

### 5.4 Communication
| Feature | Source | Priority |
|---|---|---|
| Taps (lightweight interest ping) | Buddy | MVP |
| 1:1 messaging incl. photo/video sharing | Both (merged) | MVP |
| Message request separation for unverified/new senders | FabGuys-inspired | MVP |
| Auto-expire unanswered first messages after 7 days — removed from the recipient's requests list to keep it clean; not a data-deletion event, just an inbox-hygiene one | New | MVP |
| Block / report from any profile or chat | FabGuys | MVP |

### 5.5 Social / Community
| Feature | Source | Priority |
|---|---|---|
| Timeline — single shared public activity feed, the app's default/home tab (not a per-profile feature; no individual timeline lives on anyone's profile) | FabGuys | MVP |
| Viewed Me | FabGuys | V1.1 |
| Want to Meet Today board | FabGuys | MVP |
| Events calendar (buddy-created group events) | Buddy | MVP |
| Classifieds (anonymous option) | Buddy | MVP |
| Venue guide (clubs/saunas curated + user-submitted) | Buddy | V1.1 |

### 5.5a Meet Reviews *(new — FabGuys-inspired)*
| Feature | Source | Priority |
|---|---|---|
| "We Met" confirmation gate — unlocks reviewing after a real conversation, prevents drive-by review spam | New | MVP |
| Leave a review (rating + text) of a user you've confirmed meeting | FabGuys | MVP |
| Reviewee approval flow — review is invisible until approved; rejected reviews are discarded, not retained | FabGuys | MVP |
| Reviewee visibility toggle — approved review shown **publicly on profile** or kept **private** (reviewee-only, never shown to reviewer) | FabGuys | MVP |
| Report-a-review (harassment/defamation/false content) | New | MVP |
| **Decision needed:** is the reviewer's identity shown to the public on a published review, or anonymized to the public and only revealed to the reviewee? Recommend anonymizing public-facing reviews to reduce retaliation/outing risk. | Open | — |

### 5.6 Trust & Safety
| Feature | Source | Priority |
|---|---|---|
| Report profile with reason codes, routed to moderation queue | FabGuys | MVP |
| User blocking (mutual invisibility) | FabGuys | MVP |
| Privacy & anonymity controls (hide location, hide from non-registered/search engines, anonymous event posting) | Both (merged) | MVP |
| Cookie consent manager w/ granular tracking opt-out | Buddy | MVP |

### 5.7 Platform / Localization
| Feature | Source | Priority |
|---|---|---|
| PWA installable web app (iOS/Android via Add to Home Screen) | Buddy | MVP |
| Multi-language UI (EN, DE, FR, IT, NL, ES, PT) | Both (merged) | V1.1, DE+EN at MVP |
| Multi-country support with per-country/region browsing | FabGuys | V1.1 |

### 5.8 Monetization
| Feature | Source | Priority |
|---|---|---|
| Free core product, no ads | Both | MVP |
| Grid PRO subscription (site-supporter model) | Both (merged) | MVP |
| Payment via Stripe (cards) — no financial data stored on our servers | Both (merged) | MVP |
| PRO perks: remove any soft nags, username changes, extended filters, read receipts, boosted profile in grid | Merged/new | MVP–V1.1 |

### 5.9 Legal / Compliance
| Feature | Source | Priority |
|---|---|---|
| GDPR self-service portal (access, rectify, delete, restrict, export/port, withdraw consent) | FabGuys | MVP |
| One-click, permanent account deletion | FabGuys | MVP |
| Cookie consent banner, essential-only default | Buddy | MVP |
| Privacy Policy, Terms of Service, Community Guidelines, Age Verification Policy | New | MVP |
| Data retention & deletion-after-inactivity policy | FabGuys | V1.1 |

### 5.10 Public Marketing Site — SEO & GEO *(new — gap identified, not in either source product)*
| Feature | Source | Priority |
|---|---|---|
| Public landing page (pre-login) — positioning, safety/trust messaging, PRO pricing, screenshots — **no explicit imagery**, kept fully SFW/professional | New | Pre-Launch Delivery |
| Server-rendered or statically-generated marketing pages, architecturally separate from the authenticated app shell — the app itself can stay a client-rendered PWA behind login, but public pages must be crawlable HTML, not JS-only | New | Pre-Launch Delivery |
| Core SEO: meta titles/descriptions, canonical URLs, sitemap.xml, robots.txt, Open Graph + Twitter card tags | New | Pre-Launch Delivery |
| Structured data: schema.org Organization, WebSite, and FAQPage markup on the landing/help pages | New | Pre-Launch Delivery |
| **GEO (AI answer-engine optimization)**: `llms.txt` pointing AI crawlers to key pages; clear, factual, extractable copy blocks on positioning, safety features, and pricing — written so an AI answer engine can accurately cite the platform, not just so a search engine can rank it | New | Pre-Launch Delivery |
| Content safety separation: robots meta / content-rating tags on the marketing site; explicit content strictly confined to the authenticated, age-verified app — never on a publicly crawlable page | New | Pre-Launch Delivery |
| Blog/content hub for organic SEO growth (safety guides, community content) | New | V1.1 |

---

## 6. Monetization Model

**Core principle:** safety, discovery, and explicit content are never paywalled. PRO unlocks *volume* — more of the things people naturally want more of once they're engaged — rather than asking people to pay out of goodwill ("supporter" framing, which we're deliberately avoiding). Caps sit on high-volume, low-stakes actions; messaging itself starts generous, since choking conversations at low user counts would hurt the exact engagement the platform needs early on.

**Free tier (placeholder limits — tune with real usage data):**
| Action | Free limit |
|---|---|
| Messages to new (non-matched) users per day | Generous at launch (e.g. 50/day); tighten only once usage data justifies it |
| Messages within existing conversations | Unlimited, always |
| Video views per day | Capped (e.g. 10/day) |
| Profile views per day | Capped (e.g. 100/day) |
| Favorites / Hotlist saved profiles | Capped (e.g. 25 total) — Buddy does this too, it's a sensible standing limit |
| Message history retention | Recent window (e.g. last 30 days); always deletable by the user regardless of tier |
| Reviews you can publish | 1 active per month |
| Reviews you can read on others' profiles | Capped (e.g. 10/day) |

**Grid PRO — €7.99/mo or €49.99/yr (localized pricing per market):**
- Unlimited daily messages to new users
- Unlimited video views
- Unlimited profile views
- Unlimited favorites/hotlist
- Full, unlimited message history — nothing auto-archives
- Unlimited review publishing and reading
- No soft "upgrade to see who taps you" nags
- Unlimited username changes
- Extended/saved filter presets
- Read receipts + "last seen"
- Profile boost in nearby grid (rotating, capped frequency to avoid pay-to-win perception)
- Priority customer support

**Important boundary:** the ability to delete your own messages/history is free for everyone, always, at every tier — this is a GDPR-adjacent user right, not a convenience feature, and must never be paywalled. Only *extended retention/archive* is a PRO perk, not the right to erase.

### 6a. Founding Member Program (growth mechanic)

To seed the community before the platform has enough density for people to actually meet people nearby, the **first N users** (placeholder: N = [TBD, e.g. 1,000–5,000] — set based on target city/market density, not a round number picked in the abstract) get:
- **Grid PRO, free, permanently** (grandfathered — this doesn't expire when the program ends)
- **5 referral invites** each, which grant the invitee free PRO too

**Referral rights do not chain.** Someone who joins via a referral gets free PRO, but not their own 5 invites to give out — only the original organic founding cohort can extend invites. This caps the total giveaway at a known, bounded number rather than an open-ended viral loop.

**Once the founding cohort is full**, new signups go back to the standard free/PRO structure described above — existing founding members and their referred users keep their free PRO regardless. This is a one-time bootstrap mechanic, not a permanent pricing model.

**Schema implication:** `users.founding_member`, `users.referral_invites_remaining` (starts at 5, only for organic founding members — 0 for referred users), `referral_invites` table tracking invite codes and redemptions. A simple admin-configurable threshold value determines when the program closes to new organic members.

**Payment processor strategy:** Explicit content platforms are commonly restricted or high-risk merchant categories for mainstream processors like Stripe, regardless of what's specifically paywalled — Stripe's underwriting evaluates the business as a whole, not just the subscription line item. Because PRO never unlocks explicit content (all explicit media stays free behind age verification, not payment), we can launch on **Stripe** for MVP: lower fees (~2.9%+30¢ vs. 10–15%+ for adult-specialist processors) and a materially better checkout UX at a stage where conversion matters most. This reduces but does not eliminate processor risk — Stripe can still flag the account if their risk team determines the platform is primarily an adult service.

**Mitigation:** the payment layer must be built **processor-agnostic** (see schema — generic `payment_provider` fields, not Stripe-specific), so migrating to an adult-specialist processor (CCBill, Segpay, or Epoch) if Stripe ever restricts the account, or once the platform reaches meaningful scale, is a configuration change rather than a rebuild. No PAN/CVV touches our servers under either processor — handled entirely via the processor's hosted checkout/Elements, PCI SAQ-A scope only.

---

## 7. Trust, Safety & Compliance Requirements

1. **Age gate**: hard block under-18 signups; verified via an accredited third-party age-assurance vendor, billed usage-based (per-check, not a flat subscription) — kept on an accredited vendor specifically because Germany's JMStV requires an accredited system for the closed user group, and the UK OSA requires "highly effective" age assurance that a founder-run manual check likely wouldn't satisfy. This also keeps raw ID documents off our infrastructure and out of the founder's hands entirely.
2. **Photo verification**: pose-match selfie against primary profile photo. Unlike the age gate, this is not a legal requirement — just a community-trust signal — so it can reasonably be **reviewed manually by the founder at MVP volume**, moving to AI-assisted matching once volume makes manual review impractical. Award a visible "Verified" badge on approval.
3. **Peer verification (V1.1)**: an already-verified user can vouch for another user via a short in-app message exchange — no call needed, kept simple. Self-vouching is blocked (same-device/same-account detection). A vouch is revoked if the vouching user later blocks the person they vouched for, downgrading that person's badge tier accordingly.
4. **Anti-spam**: rate-limit new accounts (message caps, no bulk media in first 24h), device fingerprinting to slow ban evasion.
5. **Moderation queue**: reported content/profiles enter a queue with reason codes (fake profile, underage concern, harassment, spam, illegal content, CSAM). CSAM reports auto-escalate, account auto-suspended pending review, reported to NCMEC/relevant authority per jurisdiction — this path is never optional or delayable.
6. **Review moderation**: reviews are user-generated content about an identifiable person and carry real harassment/defamation risk. Reviews are invisible until the reviewee approves them; rejected reviews are discarded rather than retained; approved reviews remain reportable at any time and can be removed by moderation regardless of the reviewee's original approval. Users are directed to Report Profile — not a negative review — for actual policy violations, to keep reviews from becoming a harassment channel.
7. **GDPR portal**: self-service export (JSON), rectification, restriction, and delete-my-account (irreversible, 30-day soft-delete grace window then hard purge).
8. **Cookie consent**: essential-only by default; analytics/marketing cookies opt-in, managed via a preference center, not just a banner.
9. **Data minimization**: HIV/health-status, size, and sexual-orientation fields are user-entered, optional, and stored with field-level encryption; never used for ad targeting (there are no ads); excluded from data exports to third parties.
10. **Blocking retroactively hides history**: blocking a user hides previously exchanged messages/media between the two accounts going forward for both parties, not just future contact — this is a required behavior, not just an access-prevention rule.
11. **Moderator access disclosure**: reported message content may be reviewed by moderation staff investigating that report, or in response to a lawful request — this must be disclosed plainly in the Privacy Policy, not left implicit.
12. **Deletion is never a paid feature**: the ability to delete your own messages, media, or account is free at every tier, unconditionally. Only *extended history retention* is gated behind PRO — the underlying right to erase your own data is not.

---

## 8. Non-Functional Requirements

- **Mobile-first PWA**: installable, offline-tolerant shell, push notifications via Web Push where supported, background location only with explicit, revocable permission.
- **Performance**: grid view time-to-interactive < 2s on 4G; image delivery via CDN with responsive sizes.
- **Accessibility**: WCAG 2.1 AA for all non-explicit-content screens.
- **Privacy by design**: location precision fuzzing (never expose exact GPS distance under 100m without explicit "exact location" opt-in).
- **Uptime**: 99.9% target for core discovery, profile, and chat infrastructure.

---

## 9. Suggested Tech Stack (for Claude Code)

- **Frontend (app)**: React + Vite, Tailwind, PWA plugin (Workbox) for installability and offline shell
- **Frontend (marketing site)**: separate SSR/SSG build (e.g. Next.js static export or Astro) for the public landing pages — needs to be crawlable HTML for both traditional search and AI answer engines, which a client-only SPA is not. Deployed independently from the app shell; links into the app's signup flow.
- **Backend**: Node.js (NestJS or Express) + PostgreSQL (PostGIS extension for geo queries) + Redis (presence/online status, rate limiting, and *daily/time-windowed* usage caps — e.g. messages-to-new-users/day, video views/day). *Standing total-count* caps (favorites, active published reviews) are enforced via a Postgres count check at write time instead, since they're not time-windowed.
- **Scheduled jobs**: a lightweight job runner (e.g. node-cron or a queue like BullMQ, already backed by the same Redis instance) for: 7-day unanswered-message-request expiry, message history retention pruning, founding-member threshold checks on signup
- **Media**: S3-compatible object storage + CDN, on-upload moderation hook (image hashing against known-CSAM hash lists, mandatory before any image is served)
- **Auth**: email + password (argon2) with optional passkey support; JWT session + refresh tokens
- **Payments**: Stripe Billing + Checkout for MVP, behind a processor-agnostic payment interface so migration to an adult-specialist processor (CCBill/Segpay/Epoch) is a config swap, not a rebuild — see §6
- **Realtime**: WebSocket (Socket.IO) for chat/taps/presence
- **Push**: Web Push (VAPID) for PWA notifications
- **Moderation tooling**: internal admin console for report queue, with audit log

---

## 10. Build Phasing

**A note on timeline:** with AI-assisted development, coding speed isn't really the bottleneck here — two other things are, and they don't compress just because the code gets written fast:
- **Your own review/testing cycles.** Someone still has to click through what's built, catch what's wrong, decide what's next. Inherently sequential, scales with your attention, not with tokens.
- **External vendor approval time (Phase 1 specifically).** Persona and Stripe both run underwriting/KYB checks before an account goes fully live — for an adult-content platform, expect this to take anywhere from a few days to a couple of weeks, entirely outside your control and not shortened by build speed. Start these applications as early as possible, ideally in parallel with the tail end of Phase 0, rather than after Phase 0 finishes — that's the single biggest thing you can do to compress the real calendar time to launch.

Phases below are ordered by dependency, not by fixed calendar duration.

**Phase 0 — Internal Alpha (you + one collaborator only)**
Build and hone the actual product — profile creation, nearby grid + filters, hashtag search, taps + messaging, favorites, events & classifieds, want-to-meet-today, Meet Reviews, block/report — with **age verification and payment entirely stubbed**. No real vendor integration, no real money moving. Age verification is a manual admin flag (`age_verifications.result = 'pass'` set directly, no vendor call); PRO is a manual admin flag on the account, not a real subscription. Goal: validate the product feels right before spending any integration effort or vendor cost on compliance-heavy pieces. **CSAM hash-scanning is the one exception** — keep the upload pipeline's hash-check *hook* in place from day one (even pointing at a stub/no-op scanner), so Phase 1 is plugging in a real vendor rather than retrofitting the architecture. It costs nothing to leave the seam in now and is expensive to bolt on later. **Exit criteria:** you and your collaborator can use the product end-to-end and it feels right — not a date.

**Phase 1 — Pre-Launch Delivery**
This is the hard gate before any real member joins. Wire in: the real accredited age-verification vendor (Persona, given its free tier at MVP volume — see cost discussion), the real payment processor (Stripe, structured per §6 so it's swappable later), the real CSAM hash-scanning vendor into the existing hook, the public marketing/landing site (§5.10), finalized legal pages live and versioned, cookie consent actually gating analytics scripts, and the moderation queue operational with a real reviewer (you) able to action reports. Nothing in this phase is optional or partial — it's the difference between a demo and a legally operable product. **Start vendor applications (Persona, Stripe/payment processor) as early as possible — ideally before this phase formally begins — since their approval timelines run in parallel with your build time, not after it.** **Exit criteria:** real vendor integrations live and tested, legal pages published, moderation queue operational — gated by vendor approval, not build effort.

**Phase 2 — Public MVP Launch**
Open signups, founding member program active, EN + DE locales, UK + DE markets. Triggered by Phase 1's exit criteria being met, not a date.

**Phase 3 — V1.1**
Viewed Me, peer verification (message-based vouching), venue guide, additional locales, saved filter presets, username changes, photo verification moving from manual to AI-assisted review as volume grows. Triggered by your own judgment that the MVP is stable and worth extending, not a fixed post-launch date.

**Phase 4 — V2**
Multi-country drill-down browsing, profile boosts, deeper localization.

---

## 11. Open Questions for You (Nathan)

1. Brand name/domain — "Grid" is a placeholder codename, not a final brand.
2. Launch market priority — UK+DE first, or all six from day one?
3. Who is the data controller for GDPR purposes (which legal entity), since this determines the Privacy Policy and DPA templates Claude Code should draft?

**Resolved:** Mobile web only, no native app wrappers. Webcam chat is out of scope entirely (removed from roadmap). Permanently ad-free. Peer verification is message-based, no video call. Size, HIV status, and related filters are included as an MVP first pass, to be refined later. Couple/multi-person profiles are out of scope for v1. Build order is Phase 0 Internal Alpha (you + one collaborator, verification/payment stubbed) → Phase 1 Pre-Launch Delivery (real vendors wired in, marketing site built) → Phase 2 Public Launch.

---

## 12. Handoff Note for Claude Code

This document is the spec. Suggested first prompts to Claude Code, in order:
1. Scaffold the monorepo (frontend PWA + backend API + shared types) per §9.
2. Build the Postgres schema from §4/§5 (users, profiles, media, taps, messages, events, classifieds, reports, verification_status, subscriptions).
3. **Phase 0**: implement onboarding with age verification as a manual admin-flag stub (no vendor call), and PRO/subscription as a manual admin-flag stub (no payment processor call) — but build the CSAM hash-scan hook into the media upload pipeline now, even as a no-op, so it's real work to plug in later, not architecture.
4. Build discovery grid + filters + hashtag search.
5. Build chat/taps.
6. Build events/classifieds.
7. Build Meet Reviews (We Met confirmation → review submission → reviewee approval → public/private toggle → report-a-review).
8. **Phase 1 (Pre-Launch Delivery)**: swap the age-verification stub for the real Persona integration, the PRO stub for real Stripe billing, the CSAM hook for a real scanning vendor, build the public marketing/landing site (§5.10), and finalize + publish the legal pages — this phase gates public launch and is not optional or partial.
