import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, ApiError, MediaItem, Profile } from "./api";
import { Field, inputClass } from "./Field";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];
const SIZES = ["s", "m", "l", "xl", "xxl"];
const STATUSES = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "prep", label: "PrEP" },
  { value: "tasp", label: "TasP" },
  { value: "unknown", label: "Unknown" }
];
const DIRTY_PREFERENCES = [
  { value: "dirty", label: "Dirty" },
  { value: "not_dirty", label: "Not dirty" },
  { value: "ws_only", label: "WS only" }
];
const FISTING_PREFERENCES = [
  { value: "ff_active", label: "FF Active" },
  { value: "ff_passive", label: "FF Passive" },
  { value: "ff_vers", label: "FF Vers" },
  { value: "no_ff", label: "No FF" }
];

export function ProfileForm({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [myMedia, setMyMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function loadMedia() {
    api
      .listMyMedia()
      .then(setMyMedia)
      .catch(() => undefined);
  }

  useEffect(() => {
    api
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        setHashtagsInput(p.hashtags?.join(", ") ?? "");
      })
      .catch(() => undefined)
      .finally(() => setStatus("ready"));
    loadMedia();
  }, []);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadMedia(file, "photo");
      loadMedia();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function requestLocation() {
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setProfile((p) => ({ ...p, locationShared: true }));
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setStatus("saving");
    try {
      const hashtags = hashtagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const result = await api.saveMyProfile({
        ...profile,
        hashtags,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {})
      });
      setProfile(result);
      setHashtagsInput(result.hashtags?.join(", ") ?? "");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setStatus("ready");
    }
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    onLogout();
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 pb-24">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Profile</h1>
          <button type="button" onClick={logout} className="text-sm text-slate-400 underline">
            Log out
          </button>
        </div>

        <Field id="displayName" label="Display name">
          <input
            id="displayName"
            required
            value={profile.displayName ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <Field id="bio" label="Bio">
          <textarea
            id="bio"
            value={profile.bio ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            className={inputClass}
            rows={3}
          />
        </Field>

        <Field id="role" label="Role">
          <select
            id="role"
            value={profile.role ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>

        <Field id="bodyType" label="Body type">
          <select
            id="bodyType"
            value={profile.bodyType ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, bodyType: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3">
          <div className="w-1/2">
            <Field id="age" label="Age">
              <div id="age" className={`${inputClass} text-slate-400`}>
                {profile.age ?? "—"}
              </div>
            </Field>
          </div>
          <div className="w-1/2">
            <Field id="heightCm" label="Height (cm)">
              <input
                id="heightCm"
                type="number"
                min={100}
                max={250}
                value={profile.heightCm ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, heightCm: e.target.value ? Number(e.target.value) : undefined }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <Field id="size" label="Cock size">
          <select
            id="size"
            value={profile.size ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, size: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field id="healthStatus" label="Status">
          <select
            id="healthStatus"
            value={profile.healthStatus ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, healthStatus: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="smoker" label="Smoker">
          <select
            id="smoker"
            value={profile.smoker === undefined || profile.smoker === null ? "" : String(profile.smoker)}
            onChange={(e) =>
              setProfile((p) => ({ ...p, smoker: e.target.value === "" ? undefined : e.target.value === "true" }))
            }
            className={inputClass}
          >
            <option value="">Not set</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>

        <Field id="dirtyPreference" label="Dirty">
          <select
            id="dirtyPreference"
            value={profile.dirtyPreference ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, dirtyPreference: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {DIRTY_PREFERENCES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="fistingPreference" label="Fisting">
          <select
            id="fistingPreference"
            value={profile.fistingPreference ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, fistingPreference: e.target.value || undefined }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            {FISTING_PREFERENCES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="contactInfo" label="Contact info (e.g. Telegram/Snapchat handle)">
          <input
            id="contactInfo"
            value={profile.contactInfo ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, contactInfo: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <div className="rounded-md bg-slate-900 p-3 space-y-2">
          <span className="text-sm font-medium text-slate-300">Photos</span>
          {myMedia.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {myMedia.map((m) => (
                <div
                  key={m.id}
                  className="aspect-square rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-500"
                  title={m.moderationStatus}
                >
                  📷
                </div>
              ))}
            </div>
          )}
          <label className="block w-full cursor-pointer rounded-md bg-slate-800 py-1.5 text-center text-sm">
            {uploading ? "Uploading…" : "Upload a photo"}
            <input type="file" accept="image/*" onChange={handleFileSelected} disabled={uploading} className="hidden" />
          </label>
        </div>

        <Field id="hashtags" label="Hashtags (comma-separated)">
          <input
            id="hashtags"
            placeholder="e.g. bear, kink, host"
            value={hashtagsInput}
            onChange={(e) => setHashtagsInput(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="rounded-md bg-slate-900 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Share my location</span>
            <span className="text-xs text-slate-500">
              {profile.locationShared ? "On" : "Off"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Needed to show up in the nearby grid and see distance to others.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            className="w-full rounded-md bg-slate-800 py-1.5 text-sm"
          >
            {locationStatus === "requesting"
              ? "Requesting…"
              : locationStatus === "granted"
                ? "Location captured"
                : "Use my current location"}
          </button>
          {locationStatus === "denied" && (
            <p className="text-xs text-red-400">
              Location permission denied — enable it in your browser settings to appear in the nearby grid.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-emerald-400">Saved</p>}

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
