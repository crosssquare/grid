import { useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));

  useEffect(() => {
    const onSessionExpired = () => setAuthed(false);
    window.addEventListener("grid:session-expired", onSessionExpired);
    return () => window.removeEventListener("grid:session-expired", onSessionExpired);
  }, []);

  return authed ? (
    <ProfileForm onLogout={() => setAuthed(false)} />
  ) : (
    <AuthForm onAuthenticated={() => setAuthed(true)} />
  );
}
