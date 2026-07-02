import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { media } from "../../db/schema";
import { HashScanner, NoOpHashScanner } from "./hash-scanner";

@Injectable()
export class MediaService {
  private readonly hashScanner: HashScanner = new NoOpHashScanner();

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly config: ConfigService
  ) {}

  private getS3Client() {
    const endpoint = this.config.get<string>("s3Endpoint");
    const region = this.config.get<string>("s3Region");
    const accessKeyId = this.config.get<string>("s3AccessKeyId");
    const secretAccessKey = this.config.get<string>("s3SecretAccessKey");

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        "Media storage is not configured yet (S3_ENDPOINT/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY)"
      );
    }

    return new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true
    });
  }

  async upload(userId: string, file: Express.Multer.File, mediaType: "photo" | "video") {
    const bucket = this.config.get<string>("s3Bucket");
    if (!bucket) {
      throw new ServiceUnavailableException("S3_BUCKET is not configured yet");
    }

    // Mandatory pre-publish hash-check hook (PRD §7.5 / §9 / §12 step 3) — a no-op stub in
    // Phase 0, swapped for a real CSAM hash-match vendor in Phase 1 without touching this call site.
    const scan = await this.hashScanner.scan(file.buffer);

    const storageKey = `${userId}/${randomUUID()}-${file.originalname}`;
    const s3 = this.getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    const [row] = await this.db
      .insert(media)
      .values({
        userId,
        mediaType,
        storageKey,
        hashScanResult: scan.result,
        // No private-album UI exists yet in Phase 0 — everything uploaded through this
        // endpoint goes straight to the public gallery.
        visibility: "public",
        // No human moderation queue exists yet in Phase 0 (that's a later Trust & Safety step) —
        // a clear hash scan is enough to approve for the two-person alpha test.
        moderationStatus: scan.result === "clear" ? "approved" : "csam_flagged"
      })
      .returning();

    return row;
  }

  listMine(userId: string) {
    return this.db.select().from(media).where(eq(media.userId, userId)).orderBy(desc(media.createdAt));
  }

  listForUser(userId: string) {
    return this.db
      .select()
      .from(media)
      .where(and(eq(media.userId, userId), eq(media.visibility, "public"), eq(media.moderationStatus, "approved")))
      .orderBy(desc(media.createdAt));
  }
}
