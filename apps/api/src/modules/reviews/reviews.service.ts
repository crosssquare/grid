import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { conversations, meetConfirmations, profiles, reviewLikes, reviewReports, reviews } from "../../db/schema";
import { CreateReviewDto } from "./dto/create-review.dto";
import { DecideReviewDto } from "./dto/decide-review.dto";
import { ReportReviewDto } from "./dto/report-review.dto";

@Injectable()
export class ReviewsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  // A review is only allowed once both parties have confirmed "We Met" on their shared
  // conversation (PRD §5.5a) — this is the drive-by-review-spam gate.
  async findMutualMeetConfirmation(userA: string, userB: string) {
    const [userAId, userBId] = [userA, userB].sort();
    const conversation = await this.db.query.conversations.findFirst({
      where: and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId))
    });
    if (!conversation) return null;

    const confirmations = await this.db
      .select()
      .from(meetConfirmations)
      .where(eq(meetConfirmations.conversationId, conversation.id));
    const confirmedBy = new Set(confirmations.map((c) => c.confirmedById));
    if (!confirmedBy.has(userA) || !confirmedBy.has(userB)) return null;

    // Any one of that conversation's confirmation rows anchors the review (both point at the
    // same conversation, which is all the schema's meet_confirmation_id FK actually needs).
    return confirmations.find((c) => c.confirmedById === userA) ?? confirmations[0];
  }

  async myReviewStatus(reviewerId: string, revieweeId: string) {
    const existing = await this.db.query.reviews.findFirst({
      where: and(eq(reviews.reviewerId, reviewerId), eq(reviews.revieweeId, revieweeId))
    });
    return existing?.status ?? null;
  }

  async canReview(reviewerId: string, revieweeId: string) {
    if (reviewerId === revieweeId) return false;
    const confirmation = await this.findMutualMeetConfirmation(reviewerId, revieweeId);
    if (!confirmation) return false;
    const status = await this.myReviewStatus(reviewerId, revieweeId);
    return status === null;
  }

  async create(reviewerId: string, dto: CreateReviewDto) {
    if (reviewerId === dto.revieweeId) {
      throw new BadRequestException("Can't review yourself");
    }

    const confirmation = await this.findMutualMeetConfirmation(reviewerId, dto.revieweeId);
    if (!confirmation) {
      throw new ForbiddenException("You can only review someone after you've both confirmed meeting");
    }

    const [review] = await this.db
      .insert(reviews)
      .values({
        meetConfirmationId: confirmation.id,
        reviewerId,
        revieweeId: dto.revieweeId,
        rating: dto.rating,
        body: dto.body
      })
      .onConflictDoNothing()
      .returning();

    if (!review) {
      throw new BadRequestException("You've already reviewed this person for this meet");
    }
    return review;
  }

  // Reviews pending the current user's (as reviewee) approval decision.
  listPending(revieweeId: string) {
    return this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        reviewerId: reviews.reviewerId,
        reviewerDisplayName: profiles.displayName
      })
      .from(reviews)
      .innerJoin(profiles, eq(profiles.userId, reviews.reviewerId))
      .where(and(eq(reviews.revieweeId, revieweeId), eq(reviews.status, "pending")));
  }

  listMine(reviewerId: string) {
    return this.db.query.reviews.findMany({ where: eq(reviews.reviewerId, reviewerId) });
  }

  async decide(revieweeId: string, reviewId: string, dto: DecideReviewDto) {
    const review = await this.db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
    if (!review) throw new NotFoundException("Review not found");
    if (review.revieweeId !== revieweeId) throw new ForbiddenException("Not your review to decide");
    if (review.status !== "pending") throw new BadRequestException("Review already decided");

    if (dto.decision === "rejected") {
      // Rejected reviews are hard-deleted, not retained (PRD §5.5a / schema.sql retention note).
      await this.db.delete(reviews).where(eq(reviews.id, reviewId));
      return { status: "rejected" };
    }

    const [updated] = await this.db
      .update(reviews)
      .set({ status: "approved", visibility: dto.visibility ?? "private", decidedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();
    return updated;
  }

  async report(reporterId: string, reviewId: string, dto: ReportReviewDto) {
    const review = await this.db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
    if (!review) throw new NotFoundException("Review not found");
    // Only the reviewee (the person a review is about) or the public viewer of an approved
    // public review can report it — either way, the reporter must be able to see it.
    const canSee =
      review.revieweeId === reporterId || (review.status === "approved" && review.visibility === "public");
    if (!canSee) throw new ForbiddenException("Review not found");

    const [report] = await this.db
      .insert(reviewReports)
      .values({ reviewId, reporterId, reasonCode: dto.reasonCode })
      .returning();
    return report;
  }

  async like(userId: string, reviewId: string) {
    const review = await this.db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
    if (!review || review.status !== "approved" || review.visibility !== "public") {
      throw new NotFoundException("Review not found");
    }
    await this.db.insert(reviewLikes).values({ userId, reviewId }).onConflictDoNothing();
    return { liked: true };
  }

  async unlike(userId: string, reviewId: string) {
    await this.db.delete(reviewLikes).where(and(eq(reviewLikes.userId, userId), eq(reviewLikes.reviewId, reviewId)));
    return { liked: false };
  }
}
