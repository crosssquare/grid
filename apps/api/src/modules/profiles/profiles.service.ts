import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import {
  profiles,
  users,
  hashtags,
  profileHashtags,
  media,
  mediaLikes,
  reviews,
  favorites,
  blocks,
  profileViews,
  feedPosts,
  comments,
  conversations,
  meetConfirmations
} from "../../db/schema";
import { UpsertProfileDto } from "./dto/upsert-profile.dto";
import { ReviewsService } from "../reviews/reviews.service";

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly reviewsService: ReviewsService
  ) {}

  async getOwn(userId: string) {
    const profile = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (!profile) {
      throw new NotFoundException("Profile not created yet");
    }
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    const tags = await this.getHashtags(userId);
    const profilePhotoStorageKey = await this.getProfilePhotoStorageKey(profile.profilePhotoMediaId);
    const coords = await this.getCoordinates(userId);
    return {
      ...profile,
      age: computeAge(user?.dateOfBirth ?? null),
      hashtags: tags,
      profilePhotoStorageKey,
      ...coords
    };
  }

  private async getCoordinates(userId: string): Promise<{ latitude: number | null; longitude: number | null }> {
    const result = await this.db.execute<{ lat: number | null; lng: number | null }>(sql`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
      FROM profiles WHERE user_id = ${userId}
    `);
    const row = result.rows[0];
    return { latitude: row?.lat ?? null, longitude: row?.lng ?? null };
  }

  private async getProfilePhotoStorageKey(mediaId: string | null): Promise<string | null> {
    if (!mediaId) return null;
    const row = await this.db.query.media.findFirst({ where: eq(media.id, mediaId) });
    return row?.storageKey ?? null;
  }

  async getViewed(viewerId: string, targetUserId: string) {
    const isSelf = viewerId === targetUserId;

    if (!isSelf) {
      const blocked = await this.db.query.blocks.findFirst({
        where: or(
          and(eq(blocks.userId, viewerId), eq(blocks.blockedId, targetUserId)),
          and(eq(blocks.userId, targetUserId), eq(blocks.blockedId, viewerId))
        )
      });
      if (blocked) {
        throw new NotFoundException("Profile not found");
      }
    }

    const profile = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, targetUserId) });
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    if (!isSelf && profile.visibility === "hidden") {
      throw new NotFoundException("Profile not found");
    }

    const user = await this.db.query.users.findFirst({ where: eq(users.id, targetUserId) });
    const tags = await this.getHashtags(targetUserId);

    const galleryRows = await this.db
      .select({ id: media.id, mediaType: media.mediaType, storageKey: media.storageKey, isExplicit: media.isExplicit })
      .from(media)
      .where(and(eq(media.userId, targetUserId), eq(media.visibility, "public"), eq(media.moderationStatus, "approved")))
      .orderBy(desc(media.createdAt));

    const reviewRows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        anonymized: reviews.reviewerAnonymizedPublicly,
        reviewerId: reviews.reviewerId
      })
      .from(reviews)
      .where(and(eq(reviews.revieweeId, targetUserId), eq(reviews.status, "approved"), eq(reviews.visibility, "public")))
      .orderBy(desc(reviews.createdAt));

    // Comment threads live on the review entity, so the same thread shows both here
    // and on the review's Timeline activity entry.
    const reviewComments = new Map<string, { id: string; authorId: string; authorDisplayName: string; body: string; createdAt: Date }[]>();
    if (reviewRows.length > 0) {
      const commentRows = await this.db
        .select({
          id: comments.id,
          targetId: comments.targetId,
          authorId: comments.authorId,
          body: comments.body,
          createdAt: comments.createdAt,
          authorDisplayName: profiles.displayName
        })
        .from(comments)
        .innerJoin(profiles, eq(profiles.userId, comments.authorId))
        .where(and(eq(comments.targetType, "review"), inArray(comments.targetId, reviewRows.map((r) => r.id))))
        .orderBy(comments.createdAt);
      for (const c of commentRows) {
        const list = reviewComments.get(c.targetId) ?? [];
        list.push({ id: c.id, authorId: c.authorId, authorDisplayName: c.authorDisplayName, body: c.body, createdAt: c.createdAt });
        reviewComments.set(c.targetId, list);
      }
    }

    let isFavorited = false;
    let canReview = false;
    let myReviewStatus: string | null = null;
    let iLikedMedia = false;
    let iConfirmedMet = false;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let distanceMeters: number | null = null;
    if (!isSelf) {
      // Drives the "We've met in person" toggle — the viewer's own confirmation only.
      const [convA, convB] = [viewerId, targetUserId].sort();
      const conversation = await this.db.query.conversations.findFirst({
        where: and(eq(conversations.userAId, convA), eq(conversations.userBId, convB))
      });
      if (conversation) {
        const confirmation = await this.db.query.meetConfirmations.findFirst({
          where: and(
            eq(meetConfirmations.conversationId, conversation.id),
            eq(meetConfirmations.confirmedById, viewerId)
          )
        });
        iConfirmedMet = Boolean(confirmation);
      }

      const favorite = await this.db.query.favorites.findFirst({
        where: and(eq(favorites.userId, viewerId), eq(favorites.favoriteId, targetUserId))
      });
      isFavorited = Boolean(favorite);

      myReviewStatus = await this.reviewsService.myReviewStatus(viewerId, targetUserId);
      canReview = myReviewStatus === null && Boolean(await this.reviewsService.findMutualMeetConfirmation(viewerId, targetUserId));

      if (profile.profilePhotoMediaId) {
        const like = await this.db.query.mediaLikes.findFirst({
          where: and(eq(mediaLikes.userId, viewerId), eq(mediaLikes.mediaId, profile.profilePhotoMediaId))
        });
        iLikedMedia = Boolean(like);
      }

      const viewer = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, viewerId) });
      await this.db.insert(profileViews).values({
        viewerId,
        viewedId: targetUserId,
        visibleToViewed: viewer?.notifyOnProfileView ?? true
      });

      if (profile.locationShared) {
        const locResult = await this.db.execute<{ lat: number | null; lng: number | null; distance_m: number | null }>(sql`
          SELECT
            ST_Y(target.location::geometry) AS lat,
            ST_X(target.location::geometry) AS lng,
            CASE WHEN target.location IS NOT NULL AND viewer.location IS NOT NULL
              THEN ST_Distance(target.location, viewer.location)
              ELSE NULL
            END AS distance_m
          FROM profiles target
          CROSS JOIN (SELECT location FROM profiles WHERE user_id = ${viewerId}) viewer
          WHERE target.user_id = ${targetUserId}
        `);
        const locRow = locResult.rows[0];
        latitude = locRow?.lat ?? null;
        longitude = locRow?.lng ?? null;
        distanceMeters = locRow?.distance_m == null ? null : Math.round(locRow.distance_m);
      }
    }

    let mediaLikeCount = 0;
    if (profile.profilePhotoMediaId) {
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(mediaLikes)
        .where(eq(mediaLikes.mediaId, profile.profilePhotoMediaId));
      mediaLikeCount = count;
    }

    const profilePhotoStorageKey = await this.getProfilePhotoStorageKey(profile.profilePhotoMediaId);

    // The latest Timeline post's text doubles as the profile's status line (text only,
    // attached photos intentionally not copied here).
    const latestPost = await this.db.query.feedPosts.findFirst({
      where: eq(feedPosts.userId, targetUserId),
      orderBy: desc(feedPosts.createdAt)
    });

    return {
      ...profile,
      age: computeAge(user?.dateOfBirth ?? null),
      memberSince: user?.createdAt ?? null,
      lastSeenAt: user?.lastSeenAt ?? null,
      // The id and timestamp travel with the text so the owner can edit or delete the
      // status in place. All three are null together when the latest post is photo-only.
      statusText: latestPost?.body?.trim() || null,
      statusPostId: latestPost?.body?.trim() ? latestPost.id : null,
      statusUpdatedAt: latestPost?.body?.trim() ? latestPost.createdAt : null,
      hashtags: tags,
      profilePhotoStorageKey,
      mediaLikeCount,
      iLikedMedia,
      latitude,
      longitude,
      distanceMeters,
      gallery: galleryRows.map((r) => ({
        id: r.id,
        mediaType: r.mediaType,
        storageKey: r.storageKey,
        isExplicit: r.isExplicit
      })),
      reviews: reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt,
        reviewerId: r.anonymized ? null : r.reviewerId,
        comments: reviewComments.get(r.id) ?? []
      })),
      isFavorited,
      canReview,
      myReviewStatus,
      iConfirmedMet,
      isSelf
    };
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const { latitude, longitude, hashtags: tagNames, ...profileFields } = dto;

    const values: Record<string, unknown> = { userId, ...profileFields };
    if (latitude != null && longitude != null) {
      values.location = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    }

    const [profile] = await this.db
      .insert(profiles)
      .values(values as typeof profiles.$inferInsert)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...values, updatedAt: new Date() } as Partial<typeof profiles.$inferInsert>
      })
      .returning();

    if (tagNames) {
      await this.setHashtags(userId, tagNames);
    }

    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    const tags = await this.getHashtags(userId);
    const profilePhotoStorageKey = await this.getProfilePhotoStorageKey(profile.profilePhotoMediaId);
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null), hashtags: tags, profilePhotoStorageKey };
  }

  private async getHashtags(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ tag: hashtags.tag })
      .from(profileHashtags)
      .innerJoin(hashtags, eq(profileHashtags.hashtagId, hashtags.id))
      .where(eq(profileHashtags.userId, userId));
    return rows.map((r) => r.tag);
  }

  private async setHashtags(userId: string, tagNames: string[]) {
    const cleaned = [...new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);

    await this.db.delete(profileHashtags).where(eq(profileHashtags.userId, userId));
    if (cleaned.length === 0) return;

    for (const tag of cleaned) {
      const [hashtag] = await this.db
        .insert(hashtags)
        .values({ tag })
        .onConflictDoUpdate({ target: hashtags.tag, set: { tag } })
        .returning();
      await this.db.insert(profileHashtags).values({ userId, hashtagId: hashtag.id }).onConflictDoNothing();
    }
  }
}
