import { useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { NavBar, View } from "./NavBar";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    const onSessionExpired = () => setAuthed(false);
    window.addEventListener("grid:session-expired", onSessionExpired);
    return () => window.removeEventListener("grid:session-expired", onSessionExpired);
  }, []);

  if (!authed) {
    return <AuthForm onAuthenticated={() => setAuthed(true)} />;
  }

  return (
    <>
      {view === "grid" ? <DiscoveryGrid /> : <ProfileForm onLogout={() => setAuthed(false)} />}
      <NavBar view={view} onChange={setView} />
    </>
  );
}
