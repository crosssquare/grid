export type View = "timeline" | "grid" | "chat" | "profile";

export function NavBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: "timeline", label: "Timeline" },
    { id: "grid", label: "Grid" },
    { id: "chat", label: "Chat" },
    { id: "profile", label: "Profile" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-800 bg-slate-950 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
