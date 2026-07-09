import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { comments, feedPosts, profiles, reviews } from "../../db/schema";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  // A comment target must exist and be something the commenter can actually see:
  // any post, or an approved+public review.
  private async assertTargetVisible(targetType: "post" | "review", targetId: string) {
    if (targetType === "post") {
      const post = await this.db.query.feedPosts.findFirst({ where: eq(feedPosts.id, targetId) });
      if (!post) throw new NotFoundException("Post not found");
      return;
    }
    const review = await this.db.query.reviews.findFirst({ where: eq(reviews.id, targetId) });
    if (!review || review.status !== "approved" || review.visibility !== "public") {
      throw new NotFoundException("Review not found");
    }
  }

  async create(authorId: string, dto: CreateCommentDto) {
    await this.assertTargetVisible(dto.targetType, dto.targetId);
    const [comment] = await this.db
      .insert(comments)
      .values({ authorId, targetType: dto.targetType, targetId: dto.targetId, body: dto.body.trim() })
      .returning();
    const author = await this.db.query.profiles.findFirst({ where: eq(profiles.userId, authorId) });
    return { ...comment, authorDisplayName: author?.displayName ?? "" };
  }

  async list(targetType: "post" | "review", targetId: string) {
    return this.db
      .select({
        id: comments.id,
        authorId: comments.authorId,
        authorDisplayName: profiles.displayName,
        body: comments.body,
        createdAt: comments.createdAt
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.userId, comments.authorId))
      .where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)))
      .orderBy(comments.createdAt);
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.db.query.comments.findFirst({ where: eq(comments.id, commentId) });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== userId) throw new ForbiddenException("Not your comment");
    await this.db.delete(comments).where(eq(comments.id, commentId));
    return { deleted: true };
  }
}
