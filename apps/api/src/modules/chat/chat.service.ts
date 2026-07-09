import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, or, sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { conversations, messages, messageReactions, blocks, meetConfirmations } from "../../db/schema";

interface ConversationRow extends Record<string, unknown> {
  id: string;
  status: string;
  last_message_at: string;
  other_user_id: string;
  other_display_name: string;
  other_online_status: string;
  last_message_body: string | null;
}

interface MessageRow extends Record<string, unknown> {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media_id: string | null;
  read_at: string | null;
  created_at: string;
  sender_profile_photo_storage_key: string | null;
  reactions: { userId: string; emoji: string }[];
}

@Injectable()
export class ChatService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  private async isBlocked(userA: string, userB: string) {
    const row = await this.db.query.blocks.findFirst({
      where: or(
        and(eq(blocks.userId, userA), eq(blocks.blockedId, userB)),
        and(eq(blocks.userId, userB), eq(blocks.blockedId, userA))
      )
    });
    return Boolean(row);
  }

  async getOrCreate(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException("Can't start a conversation with yourself");
    }
    if (await this.isBlocked(userId, otherUserId)) {
      throw new ForbiddenException("Can't start a conversation with this user");
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
      WHERE (c.user_a_id = ${userId} OR c.user_b_id = ${userId})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.user_id = c.user_a_id AND b.blocked_id = c.user_b_id)
             OR (b.user_id = c.user_b_id AND b.blocked_id = c.user_a_id)
        )
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
    // A block hides shared history retroactively, for both parties, going forward (PRD §7.10).
    if (await this.isBlocked(conversation.userAId, conversation.userBId)) {
      throw new ForbiddenException("This conversation is no longer accessible");
    }
    return conversation;
  }

  async getMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    const result = await this.db.execute<MessageRow>(sql`
      SELECT
        msg.id, msg.conversation_id, msg.sender_id, msg.body, msg.media_id, msg.read_at, msg.created_at,
        pm.storage_key AS sender_profile_photo_storage_key,
        COALESCE(
          (SELECT json_agg(json_build_object('userId', mr.user_id, 'emoji', mr.emoji))
           FROM message_reactions mr WHERE mr.message_id = msg.id),
          '[]'::json
        ) AS reactions
      FROM messages msg
      JOIN profiles sp ON sp.user_id = msg.sender_id
      LEFT JOIN media pm ON pm.id = sp.profile_photo_media_id
      WHERE msg.conversation_id = ${conversationId}
      ORDER BY msg.created_at ASC
    `);
    return result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      body: row.body,
      mediaId: row.media_id,
      readAt: row.read_at,
      createdAt: row.created_at,
      senderProfilePhotoStorageKey: row.sender_profile_photo_storage_key,
      reactions: row.reactions
    }));
  }

  // Charm-bar reactions: one reaction per user per message — reacting again with a
  // different emoji replaces it rather than stacking.
  async react(userId: string, conversationId: string, messageId: string, emoji: string) {
    await this.assertParticipant(userId, conversationId);
    const message = await this.db.query.messages.findFirst({ where: eq(messages.id, messageId) });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException("Message not found");
    }
    await this.db
      .insert(messageReactions)
      .values({ messageId, userId, emoji })
      .onConflictDoUpdate({
        target: [messageReactions.messageId, messageReactions.userId],
        set: { emoji, createdAt: new Date() }
      });
    return { reacted: true, emoji };
  }

  async unreact(userId: string, conversationId: string, messageId: string) {
    await this.assertParticipant(userId, conversationId);
    await this.db
      .delete(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)));
    return { reacted: false };
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

  // "We Met" confirmation gate — unlocks Meet Reviews once both parties have confirmed
  // (PRD §5.5a). Recording it here just needs a conversation to exist between the two;
  // it doesn't require either party to have already sent a message.
  async confirmMeet(userId: string, otherUserId: string) {
    const conversation = await this.getOrCreate(userId, otherUserId);
    const [confirmation] = await this.db
      .insert(meetConfirmations)
      .values({ conversationId: conversation.id, confirmedById: userId, otherUserId })
      .onConflictDoNothing()
      .returning();
    return confirmation ?? { alreadyConfirmed: true };
  }
}
