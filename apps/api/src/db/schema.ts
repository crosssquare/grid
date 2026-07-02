import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  smallint,
  customType,
  index,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  }
});

const geography = customType<{ data: string }>({
  dataType() {
    return "geography(Point, 4326)";
  }
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  country: text("country").notNull(),
  locale: text("locale").notNull().default("en"),
  accountStatus: text("account_status").notNull().default("active"),
  softDeletedAt: timestamp("soft_deleted_at", { withTimezone: true }),
  foundingMember: boolean("founding_member").notNull().default(false),
  referralInvitesRemaining: smallint("referral_invites_remaining").notNull().default(0),
  referredByUserId: uuid("referred_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const ageVerifications = pgTable("age_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref").notNull(),
  result: text("result").notNull(), // pass | fail | pending
  method: text("method").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const photoVerifications = pgTable("photo_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull().default("unverified"),
  selfieMediaId: uuid("selfie_media_id"),
  reviewMethod: text("review_method").notNull().default("manual"),
  reviewedByStaffId: uuid("reviewed_by_staff_id"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  role: text("role"),
  bodyType: text("body_type"),
  heightCm: smallint("height_cm"),
  weightKg: smallint("weight_kg"),
  healthStatus: text("health_status"),
  prepStatus: text("prep_status"),
  chemsPreference: text("chems_preference"),
  size: text("size"), // s | m | l | xl | xxl
  smoker: boolean("smoker"),
  dirtyPreference: text("dirty_preference"), // dirty | not_dirty | ws_only
  fistingPreference: text("fisting_preference"), // ff_active | ff_passive | ff_vers | no_ff
  contactInfo: text("contact_info"),
  location: geography("location"),
  locationShared: boolean("location_shared").notNull().default(false),
  locationPrecision: text("location_precision").notNull().default("fuzzed"),
  visibility: text("visibility").notNull().default("public"),
  hideFromSearchEngines: boolean("hide_from_search_engines").notNull().default(true),
  notifyOnProfileView: boolean("notify_on_profile_view").notNull().default(true),
  onlineStatus: text("online_status").notNull().default("offline"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  verifiedBadgeTier: smallint("verified_badge_tier").notNull().default(0),
  profilePhotoMediaId: uuid("profile_photo_media_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const hashtags = pgTable("hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tag: citext("tag").notNull().unique()
});

export const profileHashtags = pgTable(
  "profile_hashtags",
  {
    userId: uuid("user_id").notNull(),
    hashtagId: uuid("hashtag_id").notNull()
  },
  (t) => [primaryKey({ columns: [t.userId, t.hashtagId] })]
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mediaType: text("media_type").notNull(), // photo | video
  storageKey: text("storage_key").notNull(),
  isExplicit: boolean("is_explicit").notNull().default(false),
  visibility: text("visibility").notNull().default("private"),
  moderationStatus: text("moderation_status").notNull().default("pending"),
  hashScanResult: text("hash_scan_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull(),
    favoriteId: uuid("favorite_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [primaryKey({ columns: [t.userId, t.favoriteId] })]
);

export const blocks = pgTable(
  "blocks",
  {
    userId: uuid("user_id").notNull(),
    blockedId: uuid("blocked_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [primaryKey({ columns: [t.userId, t.blockedId] })]
);

export const profileViews = pgTable("profile_views", {
  viewerId: uuid("viewer_id").notNull(),
  viewedId: uuid("viewed_id").notNull(),
  visibleToViewed: boolean("visible_to_viewed").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow()
});

export const taps = pgTable("taps", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id").notNull(),
    userBId: uuid("user_b_id").notNull(),
    status: text("status").notNull().default("request"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [unique().on(t.userAId, t.userBId)]
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  body: text("body"),
  mediaId: uuid("media_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const meetConfirmations = pgTable(
  "meet_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    confirmedById: uuid("confirmed_by_id").notNull(),
    otherUserId: uuid("other_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [unique().on(t.conversationId, t.confirmedById)]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetConfirmationId: uuid("meet_confirmation_id").notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    revieweeId: uuid("reviewee_id").notNull(),
    rating: smallint("rating"),
    body: text("body"),
    status: text("status").notNull().default("pending"),
    visibility: text("visibility").notNull().default("private"),
    reviewerAnonymizedPublicly: boolean("reviewer_anonymized_publicly").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true })
  },
  (t) => [unique().on(t.reviewerId, t.revieweeId, t.meetConfirmationId)]
);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  venueName: text("venue_name"),
  location: geography("location"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const classifieds = pgTable("classifieds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  body: text("body").notNull(),
  anonymous: boolean("anonymous").notNull().default(false),
  availableFrom: timestamp("available_from", { withTimezone: true }),
  availableTo: timestamp("available_to", { withTimezone: true }),
  location: geography("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull(),
  reportedUserId: uuid("reported_user_id").notNull(),
  reasonCode: text("reason_code").notNull(),
  detail: text("detail"),
  status: text("status").notNull().default("open"),
  escalated: boolean("escalated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  paymentProvider: text("payment_provider").notNull(), // 'stub' in Phase 0
  providerCustomerId: text("provider_customer_id").notNull(),
  providerSubscriptionId: text("provider_subscription_id").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
