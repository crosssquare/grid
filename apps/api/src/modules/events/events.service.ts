import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { events, eventAttendees } from "../../db/schema";
import { CreateEventDto } from "./dto/create-event.dto";

interface EventRow extends Record<string, unknown> {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  venue_name: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  creator_display_name: string;
  creator_profile_photo_storage_key: string | null;
  attendee_count: number;
  i_am_attending: boolean;
  distance_m: number | null;
}

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  // Upcoming events only, soonest first. Hides events from blocked users in either
  // direction and from hidden profiles, matching how the Timeline filters activity.
  async list(viewerId: string) {
    const result = await this.db.execute<EventRow>(sql`
      SELECT
        e.id, e.creator_id, e.title, e.description, e.venue_name,
        e.starts_at, e.ends_at, e.created_at,
        creator.display_name AS creator_display_name,
        pm.storage_key AS creator_profile_photo_storage_key,
        (SELECT count(*)::int FROM event_attendees ea WHERE ea.event_id = e.id) AS attendee_count,
        EXISTS(SELECT 1 FROM event_attendees ea2 WHERE ea2.event_id = e.id AND ea2.user_id = ${viewerId}) AS i_am_attending,
        CASE WHEN e.location IS NOT NULL AND viewer.location IS NOT NULL
          THEN round(ST_Distance(e.location, viewer.location))
          ELSE NULL
        END AS distance_m
      FROM events e
      JOIN profiles creator ON creator.user_id = e.creator_id
      LEFT JOIN media pm ON pm.id = creator.profile_photo_media_id
      LEFT JOIN profiles viewer ON viewer.user_id = ${viewerId}
      WHERE e.starts_at >= now()
        AND (creator.visibility != 'hidden' OR e.creator_id = ${viewerId})
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.user_id = ${viewerId} AND b.blocked_id = e.creator_id)
             OR (b.user_id = e.creator_id AND b.blocked_id = ${viewerId})
        )
      ORDER BY e.starts_at ASC
      LIMIT 100
    `);

    return result.rows.map((r) => ({
      id: r.id,
      creatorId: r.creator_id,
      creatorDisplayName: r.creator_display_name,
      creatorProfilePhotoStorageKey: r.creator_profile_photo_storage_key,
      title: r.title,
      description: r.description,
      venueName: r.venue_name,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      createdAt: r.created_at,
      attendeeCount: r.attendee_count,
      iAmAttending: r.i_am_attending,
      distanceMeters: r.distance_m == null ? null : Number(r.distance_m),
      isMine: r.creator_id === viewerId
    }));
  }

  async create(userId: string, dto: CreateEventDto) {
    const { latitude, longitude, startsAt, endsAt, ...rest } = dto;
    const values: Record<string, unknown> = {
      creatorId: userId,
      ...rest,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null
    };
    if (latitude != null && longitude != null) {
      values.location = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    }
    const [row] = await this.db
      .insert(events)
      .values(values as typeof events.$inferInsert)
      .returning();
    return row;
  }

  async remove(userId: string, eventId: string) {
    const row = await this.db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, eventId) });
    if (!row) throw new NotFoundException("Event not found");
    if (row.creatorId !== userId) throw new ForbiddenException("Not your event");
    // event_attendees cascades on the FK, taking its Timeline activity with it.
    await this.db.delete(events).where(sql`${events.id} = ${eventId}`);
    return { deleted: true };
  }

  async attend(userId: string, eventId: string) {
    const row = await this.db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, eventId) });
    if (!row) throw new NotFoundException("Event not found");
    await this.db.insert(eventAttendees).values({ eventId, userId }).onConflictDoNothing();
    return { attending: true };
  }

  async unattend(userId: string, eventId: string) {
    await this.db
      .delete(eventAttendees)
      .where(sql`${eventAttendees.eventId} = ${eventId} AND ${eventAttendees.userId} = ${userId}`);
    return { attending: false };
  }
}
