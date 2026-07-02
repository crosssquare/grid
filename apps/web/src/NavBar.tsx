export type View = "grid" | "profile";

export function NavBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: "grid", label: "Grid" },
    { id: "profile", label: "Profile" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-800 bg-slate-950">
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
