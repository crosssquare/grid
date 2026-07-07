const PERKS = [
  "See everyone who's viewed your profile",
  "Unlimited likes and messages",
  "Advanced filters (verified only, kinks, more)",
  "Priority placement in the grid",
  "No ads"
];

export function ProUpgradeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-400">
          ← Back
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Grid PRO
        </h1>
        <p className="text-sm text-slate-400 mt-1">Get more out of Grid.</p>
      </div>

      <div className="rounded-md bg-slate-900 p-4 space-y-3 mb-6">
        {PERKS.map((perk) => (
          <div key={perk} className="flex items-center gap-2 text-sm">
            <span className="text-amber-400">★</span>
            <span>{perk}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="w-full rounded-md bg-slate-800 py-2.5 font-medium text-slate-400 disabled:opacity-70"
      >
        Coming soon
      </button>
    </div>
  );
}
