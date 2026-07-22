import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { ChatView } from "./ChatView";
import { ProfileView } from "./ProfileView";
import { Timeline } from "./Timeline";
import { NavBar, View } from "./NavBar";
import { PullToRefresh } from "./PullToRefresh";
import { TopBar } from "./TopBar";
import { NotificationsScreen } from "./NotificationsScreen";
import { ProUpgradeScreen } from "./ProUpgradeScreen";
import { disconnectSocket } from "./socket";
import { getMyUserId } from "./api";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));
  const [view, setView] = useState<View>("timeline");
  const [openConversation, setOpenConversation] = useState<{ id: string; displayName: string } | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [subScreen, setSubScreen] = useState<"notifications" | "pro" | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
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

  function changeView(v: View) {
    setProfileEditing(false);
    setView(v);
  }

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

  if (subScreen === "notifications") {
    return (
      <PullToRefresh onRefresh={refresh}>
        <NotificationsScreen
          key={refreshKey}
          onBack={() => setSubScreen(null)}
          onViewProfile={(userId) => {
            setSubScreen(null);
            setViewedUserId(userId);
          }}
        />
      </PullToRefresh>
    );
  }

  if (subScreen === "pro") {
    return <ProUpgradeScreen onBack={() => setSubScreen(null)} />;
  }

  const myUserId = getMyUserId() ?? "";

  return (
    <>
      <TopBar onUpgrade={() => setSubScreen("pro")} onNotifications={() => setSubScreen("notifications")} />
      <PullToRefresh onRefresh={refresh}>
        <div className="pt-[calc(3.25rem+env(safe-area-inset-top))]">
          {view === "timeline" && <Timeline key={refreshKey} onViewProfile={setViewedUserId} />}
          {view === "grid" && <DiscoveryGrid key={refreshKey} onViewProfile={setViewedUserId} />}
          {view === "chat" && (
            <ChatView
              key={refreshKey}
              openConversationId={openConversation}
              onConsumeOpenConversation={() => setOpenConversation(null)}
            />
          )}
          {view === "profile" &&
            (profileEditing ? (
              <ProfileForm key={refreshKey} onLogout={logout} onDone={() => setProfileEditing(false)} />
            ) : (
              <ProfileView
                key={refreshKey}
                userId={myUserId}
                onMessage={openChat}
                onEdit={() => setProfileEditing(true)}
              />
            ))}
        </div>
      </PullToRefresh>
      <NavBar view={view} onChange={changeView} />
    </>
  );
}
