import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, DrizzleDb } from "../../db/db.module";
import { users } from "../../db/schema";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.db.query.users.findFirst({ where: eq(users.email, dto.email) });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(dto.password);
    const [user] = await this.db
      .insert(users)
      .values({ email: dto.email, passwordHash, country: dto.country })
      .returning();

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({ where: eq(users.email, dto.email) });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.issueTokens(user.id, user.email);
  }

  private issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("jwtSecret"),
      expiresIn: "15m"
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("jwtRefreshSecret"),
      expiresIn: "30d"
    });
    return { accessToken, refreshToken, userId };
  }
}
