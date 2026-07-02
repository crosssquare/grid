import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { conversations, messages } from "../../db/schema";

interface ConversationRow extends Record<string, unknown> {
  id: string;
  status: string;
  last_message_at: string;
  other_user_id: string;
  other_display_name: string;
  other_online_status: string;
  last_message_body: string | null;
}

@Injectable()
export class ChatService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getOrCreate(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException("Can't start a conversation with yourself");
    }
    const [userAId, userBId] = [userId, otherUserId].sort();

    const existing = await this.db.query.conversations.findFirst({
      where: and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId))
    });
    if (existing) return existing;

    const [conversation] = await this.db.insert(conversations).values({ userAId, userBId }).returning();
    return conversation;
  }

  async list(userId: string) {
    const result = await this.db.execute<ConversationRow>(sql`
      SELECT
        c.id, c.status, c.last_message_at,
        p.user_id AS other_user_id, p.display_name AS other_display_name, p.online_status AS other_online_status,
        (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_body
      FROM conversations c
      JOIN profiles p ON p.user_id = (CASE WHEN c.user_a_id = ${userId} THEN c.user_b_id ELSE c.user_a_id END)
      WHERE c.user_a_id = ${userId} OR c.user_b_id = ${userId}
      ORDER BY c.last_message_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      lastMessageAt: row.last_message_at,
      otherUserId: row.other_user_id,
      otherDisplayName: row.other_display_name,
      otherOnlineStatus: row.other_online_status,
      lastMessageBody: row.last_message_body
    }));
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId)
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException("Not a participant in this conversation");
    }
    return conversation;
  }

  async getMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    return this.db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: asc(messages.createdAt)
    });
  }

  async sendMessage(userId: string, conversationId: string, body?: string, mediaId?: string) {
    const conversation = await this.assertParticipant(userId, conversationId);

    const [message] = await this.db.insert(messages).values({ conversationId, senderId: userId, body, mediaId }).returning();

    // A conversation graduates from 'request' to 'active' once the other party has replied.
    const distinctSenders = await this.db
      .selectDistinct({ senderId: messages.senderId })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    const nextStatus = conversation.status === "request" && distinctSenders.length > 1 ? "active" : conversation.status;

    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), status: nextStatus })
      .where(eq(conversations.id, conversationId));

    const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    return { message, otherUserId };
  }
}
