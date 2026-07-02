import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, Profile } from "./api";

const ROLES = ["top", "more_top", "vers", "bottom", "more_bottom"];
const BODY_TYPES = ["slim", "athletic", "stocky", "muscular", "average"];

export function ProfileForm({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getMyProfile()
      .then(setProfile)
      .catch(() => undefined)
      .finally(() => setStatus("ready"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setStatus("saving");
    try {
      const result = await api.saveMyProfile(profile);
      setProfile(result);
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
    onLogout();
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Profile</h1>
          <button type="button" onClick={logout} className="text-sm text-slate-400 underline">
            Log out
          </button>
        </div>

        <input
          required
          placeholder="Display name"
          value={profile.displayName ?? ""}
          onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
        />
        <textarea
          placeholder="Bio"
          value={profile.bio ?? ""}
          onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
          rows={3}
        />
        <select
          value={profile.role ?? ""}
          onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value || undefined }))}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Role (optional)</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={profile.bodyType ?? ""}
          onChange={(e) => setProfile((p) => ({ ...p, bodyType: e.target.value || undefined }))}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">Body type (optional)</option>
          {BODY_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Age"
            min={18}
            max={99}
            value={profile.age ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-1/2 rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
          />
          <input
            type="number"
            placeholder="Height (cm)"
            min={100}
            max={250}
            value={profile.heightCm ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, heightCm: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-1/2 rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
          />
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
