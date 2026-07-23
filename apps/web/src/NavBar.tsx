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
    <nav className="fixed bottom-0 left-0 right-0 flex bg-slate-950 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-3 text-sm font-medium ${
            view === tab.id ? "text-indigo-400" : "text-slate-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
