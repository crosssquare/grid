import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import {
  profiles,
  users,
  hashtags,
  profileHashtags,
  media,
  reviews,
  favorites,
  blocks,
  profileViews
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
    return { ...profile, age: computeAge(user?.dateOfBirth ?? null), hashtags: tags, profilePhotoStorageKey };
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

    let isFavorited = false;
    let canReview = false;
    let myReviewStatus: string | null = null;
    if (!isSelf) {
      const favorite = await this.db.query.favorites.findFirst({
        where: and(eq(favorites.userId, viewerId), eq(favorites.favoriteId, targetUserId))
      });
      isFavorited = Boolean(favorite);

      myReviewStatus = await this.reviewsService.myReviewStatus(viewerId, targetUserId);
      canReview = myReviewStatus === null && Boolean(await this.reviewsService.findMutualMeetConfirmation(viewerId, targetUserId));

      const viewer = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, viewerId) });
      await this.db.insert(profileViews).values({
        viewerId,
        viewedId: targetUserId,
        visibleToViewed: viewer?.notifyOnProfileView ?? true
      });
    }

    const profilePhotoStorageKey = await this.getProfilePhotoStorageKey(profile.profilePhotoMediaId);

    return {
      ...profile,
      age: computeAge(user?.dateOfBirth ?? null),
      memberSince: user?.createdAt ?? null,
      hashtags: tags,
      profilePhotoStorageKey,
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
        reviewerId: r.anonymized ? null : r.reviewerId
      })),
      isFavorited,
      canReview,
      myReviewStatus,
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
