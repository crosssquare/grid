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

// The signed-in user's id. localStorage is only written at login, so a logout or a
// failed refresh can leave us authed-but-idless — fall back to the JWT's `sub` claim
// and backfill, otherwise callers request `/profiles/` and get a spurious 404.
export function getMyUserId(): string | null {
  const stored = localStorage.getItem("userId");
  if (stored) return stored;

  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const sub = JSON.parse(json)?.sub;
    if (typeof sub !== "string" || !sub) return null;
    localStorage.setItem("userId", sub);
    return sub;
  } catch {
    return null;
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
  if (data.userId) localStorage.setItem("userId", data.userId);
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
  getUnreadCount: () => request<{ count: number }>("/conversations/unread-count"),
  getMessages: (conversationId: string) => request<Message[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, body: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  confirmMeet: (otherUserId: string) => request(`/conversations/meet/${otherUserId}`, { method: "POST" }),
  unconfirmMeet: (otherUserId: string) => request(`/conversations/meet/${otherUserId}`, { method: "DELETE" }),
  getViewedProfile: (userId: string) => request<ViewedProfile>(`/profiles/${userId}`),
  addFavorite: (userId: string) => request(`/favorites/${userId}`, { method: "POST" }),
  removeFavorite: (userId: string) => request(`/favorites/${userId}`, { method: "DELETE" }),
  block: (userId: string) => request(`/blocks/${userId}`, { method: "POST" }),
  unblock: (userId: string) => request(`/blocks/${userId}`, { method: "DELETE" }),
  report: (reportedUserId: string, reasonCode: string, detail?: string) =>
    request("/reports", { method: "POST", body: JSON.stringify({ reportedUserId, reasonCode, detail }) }),
  listMyMedia: () => request<MediaItem[]>("/media/mine"),
  listUserMedia: (userId: string) => request<MediaItem[]>(`/media/user/${userId}`),
  uploadMedia: (file: File, mediaType: "photo" | "video", skipPost = false) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mediaType", mediaType);
    if (skipPost) form.append("skipPost", "true");
    return request<MediaItem>("/media", { method: "POST", body: form });
  },
  deleteMedia: (mediaId: string) => request(`/media/${mediaId}`, { method: "DELETE" }),
  listEvents: () => request<EventItem[]>("/events"),
  createEvent: (input: CreateEventInput) =>
    request<EventItem>("/events", { method: "POST", body: JSON.stringify(input) }),
  deleteEvent: (id: string) => request(`/events/${id}`, { method: "DELETE" }),
  attendEvent: (id: string) => request(`/events/${id}/attend`, { method: "POST" }),
  unattendEvent: (id: string) => request(`/events/${id}/attend`, { method: "DELETE" }),
  listClassifieds: () => request<Classified[]>("/classifieds"),
  createClassified: (input: CreateClassifiedInput) =>
    request<Classified>("/classifieds", { method: "POST", body: JSON.stringify(input) }),
  deleteClassified: (id: string) => request(`/classifieds/${id}`, { method: "DELETE" }),
  setProfilePhoto: (mediaId: string) => request(`/media/${mediaId}/profile-photo`, { method: "PUT" }),
  likeMedia: (mediaId: string) => request(`/media/${mediaId}/like`, { method: "POST" }),
  unlikeMedia: (mediaId: string) => request(`/media/${mediaId}/like`, { method: "DELETE" }),
  submitReview: (revieweeId: string, rating: number | undefined, body: string) =>
    request<Review>("/reviews", { method: "POST", body: JSON.stringify({ revieweeId, rating, body }) }),
  listPendingReviews: () => request<PendingReview[]>("/reviews/pending"),
  listMyReviews: () => request<Review[]>("/reviews/mine"),
  decideReview: (reviewId: string, decision: "approved" | "rejected", visibility?: "public" | "private") =>
    request(`/reviews/${reviewId}/decision`, { method: "PUT", body: JSON.stringify({ decision, visibility }) }),
  reportReview: (reviewId: string, reasonCode: string) =>
    request(`/reviews/${reviewId}/report`, { method: "POST", body: JSON.stringify({ reasonCode }) }),
  createPost: (body: string, mediaIds?: string[]) =>
    request<Post>("/posts", { method: "POST", body: JSON.stringify({ body: body || undefined, mediaIds }) }),
  listFeed: () => request<FeedPost[]>("/posts"),
  updatePost: (postId: string, body: string) =>
    request<Post>(`/posts/${postId}`, { method: "PUT", body: JSON.stringify({ body }) }),
  deletePost: (postId: string) => request(`/posts/${postId}`, { method: "DELETE" }),
  listNotifications: () => request<Notification[]>("/notifications"),
  likeReview: (reviewId: string) => request(`/reviews/${reviewId}/like`, { method: "POST" }),
  unlikeReview: (reviewId: string) => request(`/reviews/${reviewId}/like`, { method: "DELETE" }),
  listComments: (targetType: "post" | "review", targetId: string) =>
    request<Comment[]>(`/comments/${targetType}/${targetId}`),
  createComment: (targetType: "post" | "review", targetId: string, body: string) =>
    request<Comment>("/comments", { method: "POST", body: JSON.stringify({ targetType, targetId, body }) }),
  deleteComment: (commentId: string) => request(`/comments/${commentId}`, { method: "DELETE" }),
  reactToMessage: (conversationId: string, messageId: string, emoji: string) =>
    request(`/conversations/${conversationId}/messages/${messageId}/reaction`, {
      method: "PUT",
      body: JSON.stringify({ emoji })
    }),
  removeMessageReaction: (conversationId: string, messageId: string) =>
    request(`/conversations/${conversationId}/messages/${messageId}/reaction`, { method: "DELETE" })
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
  profilePhotoMediaId?: string | null;
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
  comments: Comment[];
}

export interface ViewedProfile extends Profile {
  memberSince: string;
  gallery: MediaItem[];
  reviews: ViewedReview[];
  isFavorited: boolean;
  canReview: boolean;
  myReviewStatus: string | null;
  mediaLikeCount: number;
  iLikedMedia: boolean;
  distanceMeters: number | null;
  lastSeenAt: string | null;
  statusText: string | null;
  statusPostId: string | null;
  statusUpdatedAt: string | null;
  isSelf: boolean;
  onlineStatus: string;
  verifiedBadgeTier: number;
  iConfirmedMet: boolean;
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

export interface FeedMedia {
  id: string;
  storageKey: string;
  mediaType: string;
  likeCount: number;
  iLiked: boolean;
}

export interface FeedPost {
  id: string;
  kind: "post" | "like" | "review" | "event_created" | "event_joined";
  userId: string;
  body: string | null;
  // Set on event activity only — the event the entry refers to.
  eventId: string | null;
  mediaId: string | null;
  mediaStorageKey: string | null;
  mediaType: string | null;
  media: FeedMedia[];
  rating: number | null;
  createdAt: string;
  displayName: string;
  profilePhotoStorageKey: string | null;
  lastSeenAt: string | null;
  targetUserId: string | null;
  targetDisplayName: string | null;
  likeCount: number;
  iLiked: boolean;
  commentCount: number;
  isMine: boolean;
}

export interface EventItem {
  id: string;
  creatorId: string;
  creatorDisplayName: string;
  creatorProfilePhotoStorageKey: string | null;
  title: string;
  description: string | null;
  venueName: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  attendeeCount: number;
  iAmAttending: boolean;
  distanceMeters: number | null;
  isMine: boolean;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  venueName?: string;
  startsAt: string;
  endsAt?: string;
  latitude?: number;
  longitude?: number;
}

export interface Classified {
  id: string;
  // null on an anonymous listing that isn't yours — the API withholds it, the client
  // never has the author's identity to leak.
  userId: string | null;
  displayName: string | null;
  profilePhotoStorageKey: string | null;
  body: string;
  anonymous: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  createdAt: string;
  distanceMeters: number | null;
  isMine: boolean;
}

export interface CreateClassifiedInput {
  body: string;
  anonymous?: boolean;
  availableFrom?: string;
  availableTo?: string;
  latitude?: number;
  longitude?: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  kind: "like" | "review";
  actorId: string;
  actorDisplayName: string;
  actorProfilePhotoStorageKey: string | null;
  mediaId: string | null;
  mediaStorageKey: string | null;
  mediaType: string | null;
  rating: number | null;
  body: string | null;
  reviewStatus: string | null;
  createdAt: string;
}

export interface DiscoveryParams {
  sort?: "distance" | "new";
  onlineOnly?: boolean;
  role?: string;
  bodyType?: string;
  healthStatus?: string;
  hashtag?: string;
  search?: string;
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
  lastSeenAt: string | null;
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
  otherProfilePhotoStorageKey: string | null;
  lastMessageBody: string | null;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  mediaId: string | null;
  readAt: string | null;
  createdAt: string;
  senderProfilePhotoStorageKey?: string | null;
  reactions?: MessageReaction[];
}
