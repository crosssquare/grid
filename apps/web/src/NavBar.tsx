export type View = "timeline" | "grid" | "chat" | "events" | "profile";

// Chat and Profile are reached from the TopBar, not here — they stay valid Views so
// every existing setView("chat") call site keeps working, they just aren't tabs.
export function NavBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: "timeline", label: "Home" },
    { id: "grid", label: "Guys" },
    { id: "events", label: "Events" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex bg-slate-950/90 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          aria-current={view === tab.id ? "page" : undefined}
          className="flex flex-1 items-center justify-center py-3"
        >
          {/* The chip is an inner span so the button keeps its full 48px touch target
              while the filled pill stays compact — same treatment as the Events
              segmented control and the Grid filter chips. */}
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              view === tab.id ? "bg-indigo-600 text-slate-100" : "text-slate-500"
            }`}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
