import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { users } from "../../db/schema";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let userId: string;
    try {
      const payload = this.jwt.verify<{ sub: string }>(header.slice("Bearer ".length), {
        secret: this.config.get<string>("jwtSecret")
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || user.accountStatus === "suspended" || user.accountStatus.endsWith("deleted")) {
      throw new ForbiddenException("This account is not active");
    }

    request.userId = userId;
    return true;
  }
}
