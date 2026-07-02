export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const SUPABASE_STORAGE_PUBLIC_URL =
  import.meta.env.VITE_SUPABASE_STORAGE_URL ?? "https://ukczzbamgfqyvnrlojsc.supabase.co/storage/v1/object/public/media";

export function getMediaUrl(storageKey: string): string {
  return `${SUPABASE_STORAGE_PUBLIC_URL}/${storageKey}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) return false;

  const data: AuthResponse = await res.json();
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return true;
}

async function rawRequest(path: string, options: RequestInit): Promise<Response> {
  const token = localStorage.getItem("accessToken");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const res = await rawRequest(path, options);

  if (res.status === 401 && !isRetry && localStorage.getItem("refreshToken")) {
    // Coalesce concurrent 401s into a single refresh call rather than one per request.
    refreshInFlight ??= tryRefresh().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return request<T>(path, options, true);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    window.dispatchEvent(new Event("grid:session-expired"));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(Array.isArray(body.message) ? body.message.join(", ") : body.message, res.status);
  }

  return res.json();
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export const api = {
  signup: (email: string, password: string, dateOfBirth: string, country: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, dateOfBirth, country })
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getMyProfile: () => request<Profile>("/profiles/me"),
  saveMyProfile: (dto: Partial<Profile>) =>
    request<Profile>("/profiles/me", { method: "PUT", body: JSON.stringify(dto) }),
  discover: (params: DiscoveryParams) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") search.set(key, String(value));
    }
    const qs = search.toString();
    return request<DiscoveryProfile[]>(`/discovery${qs ? `?${qs}` : ""}`);
  },
  sendTap: (recipientId: string) => request<Tap>("/taps", { method: "POST", body: JSON.stringify({ recipientId }) }),
  tapsReceived: () => request<Tap[]>("/taps/received"),
  tapsSent: () => request<Tap[]>("/taps/sent"),
  startConversation: (otherUserId: string) =>
    request<Conversation>("/conversations", { method: "POST", body: JSON.stringify({ otherUserId }) }),
  listConversations: () => request<ConversationSummary[]>("/conversations"),
  getMessages: (conversationId: string) => request<Message[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, body: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  confirmMeet: (otherUserId: string) => request(`/conversations/meet/${otherUserId}`, { method: "POST" }),
  getViewedProfile: (userId: string) => request<ViewedProfile>(`/profiles/${userId}`),
  addFavorite: (userId: string) => request(`/favorites/${userId}`, { method: "POST" }),
  removeFavorite: (userId: string) => request(`/favorites/${userId}`, { method: "DELETE" }),
  block: (userId: string) => request(`/blocks/${userId}`, { method: "POST" }),
  unblock: (userId: string) => request(`/blocks/${userId}`, { method: "DELETE" }),
  report: (reportedUserId: string, reasonCode: string, detail?: string) =>
    request("/reports", { method: "POST", body: JSON.stringify({ reportedUserId, reasonCode, detail }) }),
  listMyMedia: () => request<MediaItem[]>("/media/mine"),
  listUserMedia: (userId: string) => request<MediaItem[]>(`/media/user/${userId}`),
  uploadMedia: (file: File, mediaType: "photo" | "video") => {
    const form = new FormData();
    form.append("file", file);
    form.append("mediaType", mediaType);
    return request<MediaItem>("/media", { method: "POST", body: form });
  },
  setProfilePhoto: (mediaId: string) => request(`/media/${mediaId}/profile-photo`, { method: "PUT" }),
  submitReview: (revieweeId: string, rating: number | undefined, body: string) =>
    request<Review>("/reviews", { method: "POST", body: JSON.stringify({ revieweeId, rating, body }) }),
  listPendingReviews: () => request<PendingReview[]>("/reviews/pending"),
  listMyReviews: () => request<Review[]>("/reviews/mine"),
  decideReview: (reviewId: string, decision: "approved" | "rejected", visibility?: "public" | "private") =>
    request(`/reviews/${reviewId}/decision`, { method: "PUT", body: JSON.stringify({ decision, visibility }) }),
  reportReview: (reviewId: string, reasonCode: string) =>
    request(`/reviews/${reviewId}/report`, { method: "POST", body: JSON.stringify({ reasonCode }) }),
  createPost: (body: string) => request<Post>("/posts", { method: "POST", body: JSON.stringify({ body }) }),
  listFeed: () => request<FeedPost[]>("/posts"),
  deletePost: (postId: string) => request(`/posts/${postId}`, { method: "DELETE" })
};

export interface Profile {
  userId: string;
  displayName: string;
  bio: string | null;
  role: string | null;
  bodyType: string | null;
  age: number | null;
  heightCm: number | null;
  size: string | null;
  healthStatus: string | null;
  smoker: boolean | null;
  dirtyPreference: string | null;
  fistingPreference: string | null;
  contactInfo: string | null;
  locationShared: boolean;
  hashtags: string[];
  profilePhotoStorageKey: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MediaItem {
  id: string;
  mediaType: string;
  storageKey: string;
  isExplicit: boolean;
  visibility?: string;
  moderationStatus?: string;
}

export interface ViewedReview {
  id: string;
  rating: number | null;
  body: string | null;
  createdAt: string;
  reviewerId: string | null;
}

export interface ViewedProfile extends Profile {
  memberSince: string;
  gallery: MediaItem[];
  reviews: ViewedReview[];
  isFavorited: boolean;
  canReview: boolean;
  myReviewStatus: string | null;
  tapCount: number;
  iTapped: boolean;
  isSelf: boolean;
  onlineStatus: string;
  verifiedBadgeTier: number;
}

export interface Review {
  id: string;
  meetConfirmationId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number | null;
  body: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface PendingReview {
  id: string;
  rating: number | null;
  body: string | null;
  createdAt: string;
  reviewerId: string;
  reviewerDisplayName: string;
}

export interface Post {
  id: string;
  userId: string;
  body: string | null;
  mediaId: string | null;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  userId: string;
  body: string | null;
  mediaId: string | null;
  createdAt: string;
  displayName: string;
  profilePhotoStorageKey: string | null;
  isMine: boolean;
}

export interface DiscoveryParams {
  sort?: "distance" | "new";
  onlineOnly?: boolean;
  role?: string;
  bodyType?: string;
  healthStatus?: string;
  hashtag?: string;
}

export interface DiscoveryProfile {
  userId: string;
  displayName: string;
  bio: string | null;
  role: string | null;
  bodyType: string | null;
  healthStatus: string | null;
  onlineStatus: string;
  verifiedBadgeTier: number;
  age: number | null;
  distanceMeters: number | null;
  profilePhotoStorageKey: string | null;
  isSelf: boolean;
}

export interface Tap {
  id: string;
  createdAt: string;
  senderId?: string;
  recipientId?: string;
  displayName: string;
}

export interface Conversation {
  id: string;
  userAId: string;
  userBId: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  status: string;
  lastMessageAt: string;
  otherUserId: string;
  otherDisplayName: string;
  otherOnlineStatus: string;
  lastMessageBody: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  mediaId: string | null;
  readAt: string | null;
  createdAt: string;
}
