import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { reports, users } from "../../db/schema";
import { CreateReportDto } from "./dto/create-report.dto";

// CSAM reports auto-escalate, account auto-suspended pending review — this path
// is never optional or delayable, per PRD §7.5.
const AUTO_ESCALATE_REASONS = new Set(["csam", "underage_concern"]);

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException("Can't report yourself");
    }

    const escalated = AUTO_ESCALATE_REASONS.has(dto.reasonCode);

    const [report] = await this.db
      .insert(reports)
      .values({
        reporterId,
        reportedUserId: dto.reportedUserId,
        reasonCode: dto.reasonCode,
        detail: dto.detail,
        escalated
      })
      .returning();

    if (escalated) {
      await this.db.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, dto.reportedUserId));
    }

    return report;
  }
}
