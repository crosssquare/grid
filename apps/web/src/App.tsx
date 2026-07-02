import { useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));

  return authed ? (
    <ProfileForm onLogout={() => setAuthed(false)} />
  ) : (
    <AuthForm onAuthenticated={() => setAuthed(true)} />
  );
}
