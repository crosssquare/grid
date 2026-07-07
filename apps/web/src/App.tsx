import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { ChatView } from "./ChatView";
import { ProfileView } from "./ProfileView";
import { Timeline } from "./Timeline";
import { NavBar, View } from "./NavBar";
import { PullToRefresh } from "./PullToRefresh";
import { disconnectSocket } from "./socket";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));
  const [view, setView] = useState<View>("timeline");
  const [openConversation, setOpenConversation] = useState<{ id: string; displayName: string } | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const onSessionExpired = () => setAuthed(false);
    window.addEventListener("grid:session-expired", onSessionExpired);
    return () => window.removeEventListener("grid:session-expired", onSessionExpired);
  }, []);

  const openChat = useCallback((id: string, displayName: string) => {
    setViewedUserId(null);
    setOpenConversation({ id, displayName });
    setView("chat");
  }, []);

  function logout() {
    disconnectSocket();
    setAuthed(false);
  }

  if (!authed) {
    return <AuthForm onAuthenticated={() => setAuthed(true)} />;
  }

  if (viewedUserId) {
    return (
      <PullToRefresh onRefresh={refresh}>
        <ProfileView key={refreshKey} userId={viewedUserId} onBack={() => setViewedUserId(null)} onMessage={openChat} />
      </PullToRefresh>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={refresh}>
        {view === "timeline" && <Timeline key={refreshKey} onViewProfile={setViewedUserId} />}
        {view === "grid" && <DiscoveryGrid key={refreshKey} onViewProfile={setViewedUserId} />}
        {view === "chat" && (
          <ChatView
            key={refreshKey}
            openConversationId={openConversation}
            onConsumeOpenConversation={() => setOpenConversation(null)}
          />
        )}
        {view === "profile" && <ProfileForm key={refreshKey} onLogout={logout} />}
      </PullToRefresh>
      <NavBar view={view} onChange={setView} />
    </>
  );
}
