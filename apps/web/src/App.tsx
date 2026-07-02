import type { User } from "@grid/shared";

const placeholderUser: Pick<User, "email" | "country"> = {
  email: "placeholder@grid.app",
  country: "GB"
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Grid</h1>
        <p className="text-slate-400">Monorepo scaffold — apps/web is running.</p>
        <p className="text-slate-500 text-sm">@grid/shared wired: {placeholderUser.email}</p>
      </div>
    </div>
  );
}
