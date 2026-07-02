import { FormEvent, useState } from "react";
import { api, ApiError } from "./api";

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("GB");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = mode === "signup" ? await api.signup(email, password, country) : await api.login(email, password);
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Grid</h1>
        <div className="flex rounded-lg bg-slate-900 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm ${mode === "login" ? "bg-slate-700" : ""}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm ${mode === "signup" ? "bg-slate-700" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
        />
        {mode === "signup" && (
          <input
            required
            placeholder="Country (e.g. GB, DE)"
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="w-full rounded-md bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
          />
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium disabled:opacity-50"
        >
          {loading ? "..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
    </div>
  );
}
