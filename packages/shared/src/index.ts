export type Role = "top" | "more_top" | "vers" | "bottom" | "more_bottom";

export type BodyType = "slim" | "athletic" | "stocky" | "muscular" | "average";

export type AccountStatus = "active" | "suspended" | "soft_deleted" | "hard_deleted";

export type ProfileVisibility = "public" | "registered_only" | "hidden";

export interface User {
  id: string;
  email: string;
  country: string;
  locale: string;
  accountStatus: AccountStatus;
  foundingMember: boolean;
  createdAt: string;
}

export interface Profile {
  userId: string;
  displayName: string;
  bio: string | null;
  role: Role | null;
  bodyType: BodyType | null;
  visibility: ProfileVisibility;
  verifiedBadgeTier: 0 | 1 | 2;
}
