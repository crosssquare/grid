import { FormEvent, useState } from "react";
import { api, ApiError } from "./api";
import { Field, inputClass } from "./Field";
import { LAUNCH_MARKET_COUNTRIES } from "./countries";

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("GB");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isAtLeast18(dob: string): boolean {
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hadBirthdayThisYear =
      today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    return age >= 18;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (mode === "signup" && !isAtLeast18(dateOfBirth)) {
      setError("You must be at least 18 years old to sign up");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "signup" ? await api.signup(email, password, dateOfBirth, country) : await api.login(email, password);
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

        <Field id="email" label="Email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field id="password" label="Password">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs text-slate-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        {mode === "signup" && (
          <>
            <Field id="confirmPassword" label="Confirm password">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="dateOfBirth" label="Date of birth">
              <input
                id="dateOfBirth"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="country" label="Which country are you in?">
              <select
                id="country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                {LAUNCH_MARKET_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
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
