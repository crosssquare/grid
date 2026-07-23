import { useEffect, useState } from "react";
import { api, ApiError, Classified, EventItem, getMediaUrl } from "./api";
import { LocationPin } from "./LocationPin";

type Tab = "events" | "classifieds";

function formatWhen(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (!endsAt) return `${date} · ${time}`;
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}–${endTime}`;
}

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km away` : `${meters}m away`;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function EventsScreen({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const [tab, setTab] = useState<Tab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [classifieds, setClassifieds] = useState<Classified[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [venueName, setVenueName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [availableTo, setAvailableTo] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([api.listEvents(), api.listClassifieds()])
      .then(([e, c]) => {
        setEvents(e);
        setClassifieds(c);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetComposer() {
    setComposing(false);
    setTitle("");
    setVenueName("");
    setStartsAt("");
    setDescription("");
    setBody("");
    setAnonymous(false);
    setAvailableTo("");
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (tab === "events") {
        if (!title.trim() || !startsAt) return;
        await api.createEvent({
          title: title.trim(),
          venueName: venueName.trim() || undefined,
          description: description.trim() || undefined,
          // datetime-local gives a naive string; the Date round-trip pins it to the
          // user's own timezone before it goes over the wire as ISO.
          startsAt: new Date(startsAt).toISOString()
        });
      } else {
        if (!body.trim()) return;
        await api.createClassified({
          body: body.trim(),
          anonymous,
          availableTo: availableTo ? new Date(availableTo).toISOString() : undefined
        });
      }
      resetComposer();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAttend(e: EventItem) {
    const wasAttending = e.iAmAttending;
    setEvents((prev) =>
      prev.map((x) =>
        x.id === e.id
          ? { ...x, iAmAttending: !wasAttending, attendeeCount: x.attendeeCount + (wasAttending ? -1 : 1) }
          : x
      )
    );
    try {
      await (wasAttending ? api.unattendEvent(e.id) : api.attendEvent(e.id));
    } catch {
      // Put the row back the way it was; the server is the source of truth.
      setEvents((prev) =>
        prev.map((x) =>
          x.id === e.id
            ? { ...x, iAmAttending: wasAttending, attendeeCount: x.attendeeCount + (wasAttending ? 1 : -1) }
            : x
        )
      );
    }
  }

  async function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await api.deleteEvent(id).catch(() => load());
  }

  async function removeClassified(id: string) {
    setClassifieds((prev) => prev.filter((c) => c.id !== id));
    await api.deleteClassified(id).catch(() => load());
  }

  const canSubmit = tab === "events" ? Boolean(title.trim() && startsAt) : Boolean(body.trim());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events</h1>
        <LocationPin />
      </div>

      <div className="mb-4 flex gap-2">
        {(["events", "classifieds"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              resetComposer();
            }}
            className={`flex-1 rounded-full py-2 text-xs font-medium ${
              tab === t ? "bg-indigo-600 text-slate-100" : "bg-slate-900 text-slate-400"
            }`}
          >
            {t === "events" ? "Events" : "Classifieds"}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {composing ? (
        <div className="mb-4 rounded-md bg-slate-900 p-3 space-y-2">
          {tab === "events" ? (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's happening?"
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
              <input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Where? (optional)"
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details (optional)"
                rows={2}
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
            </>
          ) : (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What you're after, and when"
                rows={3}
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
              <input
                type="datetime-local"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="block w-full rounded-md bg-slate-800 p-2 text-sm outline-none"
              />
              <button
                onClick={() => setAnonymous((a) => !a)}
                role="switch"
                aria-checked={anonymous}
                className="flex w-full items-center justify-between rounded-md bg-slate-800 px-3 py-2.5 text-left text-sm"
              >
                <span>Post anonymously</span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    anonymous ? "bg-indigo-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      anonymous ? "left-[1.375rem]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={resetComposer} className="flex-1 rounded-md bg-slate-800 py-2 text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || !canSubmit}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="mb-4 w-full rounded-md bg-indigo-600 py-2.5 text-sm font-medium"
        >
          {tab === "events" ? "Create an event" : "Post a classified"}
        </button>
      )}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && tab === "events" && (
        <div className="space-y-2">
          {events.length === 0 && <p className="text-sm text-slate-500">Nothing coming up — create the first one.</p>}
          {events.map((e) => (
            <div key={e.id} className="rounded-md bg-slate-900 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{e.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatWhen(e.startsAt, e.endsAt)}
                    {e.venueName && ` · ${e.venueName}`}
                    {formatDistance(e.distanceMeters) && ` · ${formatDistance(e.distanceMeters)}`}
                  </p>
                </div>
                {e.isMine && (
                  <button
                    onClick={() => removeEvent(e.id)}
                    aria-label="Delete event"
                    title="Delete event"
                    className="shrink-0 text-slate-400"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>

              {e.description && <p className="break-words text-sm text-slate-300">{e.description}</p>}

              <button onClick={() => onViewProfile(e.creatorId)} className="flex items-center gap-2 text-xs text-slate-400">
                {e.creatorProfilePhotoStorageKey ? (
                  <img
                    src={getMediaUrl(e.creatorProfilePhotoStorageKey)}
                    alt=""
                    className="h-6 w-6 rounded-full bg-slate-800 object-cover"
                  />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-slate-800" />
                )}
                {e.creatorDisplayName}
              </button>

              <button
                onClick={() => toggleAttend(e)}
                className={`w-full rounded-md py-2 text-sm font-medium ${
                  e.iAmAttending ? "bg-slate-800 text-slate-300" : "bg-indigo-600"
                }`}
              >
                {e.iAmAttending ? "Going" : "Join"} · {e.attendeeCount}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "classifieds" && (
        <div className="space-y-2">
          {classifieds.length === 0 && <p className="text-sm text-slate-500">No classifieds yet.</p>}
          {classifieds.map((c) => (
            <div key={c.id} className="rounded-md bg-slate-900 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 break-words text-sm">{c.body}</p>
                {c.isMine && (
                  <button
                    onClick={() => removeClassified(c.id)}
                    aria-label="Delete classified"
                    title="Delete classified"
                    className="shrink-0 text-slate-400"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                {c.userId ? (
                  <button onClick={() => onViewProfile(c.userId!)} className="flex items-center gap-2 text-slate-400">
                    {c.profilePhotoStorageKey ? (
                      <img
                        src={getMediaUrl(c.profilePhotoStorageKey)}
                        alt=""
                        className="h-6 w-6 rounded-full bg-slate-800 object-cover"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-slate-800" />
                    )}
                    {c.displayName}
                  </button>
                ) : (
                  <span>Anonymous</span>
                )}
                {c.availableTo && <span>· until {new Date(c.availableTo).toLocaleDateString()}</span>}
                {formatDistance(c.distanceMeters) && <span>· {formatDistance(c.distanceMeters)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
