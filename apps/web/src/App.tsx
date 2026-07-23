import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { ProfileForm } from "./ProfileForm";
import { DiscoveryGrid } from "./DiscoveryGrid";
import { ChatView } from "./ChatView";
import { ProfileView } from "./ProfileView";
import { Timeline } from "./Timeline";
import { EventsScreen } from "./EventsScreen";
import { NavBar, View } from "./NavBar";
import { PullToRefresh } from "./PullToRefresh";
import { TopBar } from "./TopBar";
import { NotificationsScreen } from "./NotificationsScreen";
import { ProUpgradeScreen } from "./ProUpgradeScreen";
import { disconnectSocket } from "./socket";
import { getMyUserId } from "./api";

const VIEW_KEY = "grid:view";
const VIEWED_USER_KEY = "grid:viewedUserId";
const VIEWS: View[] = ["timeline", "grid", "chat", "events", "profile"];

// Where you are is kept in sessionStorage so a reload — the browser's, or a genuine
// refresh — puts you back on the same screen instead of Home. sessionStorage, not
// local: reopening the app fresh should still start at Home.
function readView(): View {
  const stored = sessionStorage.getItem(VIEW_KEY) as View | null;
  return stored && VIEWS.includes(stored) ? stored : "timeline";
}

function clearNavigationState() {
  sessionStorage.removeItem(VIEW_KEY);
  sessionStorage.removeItem(VIEWED_USER_KEY);
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem("accessToken")));
  const [view, setView] = useState<View>(readView);
  const [openConversation, setOpenConversation] = useState<{ id: string; displayName: string } | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(() => sessionStorage.getItem(VIEWED_USER_KEY));
  const [subScreen, setSubScreen] = useState<"notifications" | "pro" | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    sessionStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (viewedUserId) sessionStorage.setItem(VIEWED_USER_KEY, viewedUserId);
    else sessionStorage.removeItem(VIEWED_USER_KEY);
  }, [viewedUserId]);

  useEffect(() => {
    const onSessionExpired = () => {
      // Don't leave the next person to sign in on this device staring at the
      // previous user's screen.
      clearNavigationState();
      setAuthed(false);
    };
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
    clearNavigationState();
    setView("timeline");
    setViewedUserId(null);
    setAuthed(false);
  }

  if (!authed) {
    return <AuthForm onAuthenticated={() => setAuthed(true)} />;
  }

  if (viewedUserId) {
    return (
      <PullToRefresh onRefresh={refresh}>
        <ProfileView
          key={refreshKey}
          userId={viewedUserId}
          onBack={() => setViewedUserId(null)}
          onMessage={openChat}
          // Your own card shows up in the Grid, so this branch has to offer Edit too.
          // ProfileForm only lives in the Profile-tab branch below — route there rather
          // than mounting a second copy of it.
          onEdit={() => {
            setViewedUserId(null);
            setView("profile");
            setProfileEditing(true);
          }}
        />
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
      <TopBar
        onProfile={() => changeView("profile")}
        onChat={() => changeView("chat")}
        onUpgrade={() => setSubScreen("pro")}
        onNotifications={() => setSubScreen("notifications")}
      />
      <PullToRefresh onRefresh={refresh}>
        {/* 4.5rem = the TopBar's real height: a 48px touch-target row (the base
            min-height on buttons) plus its 12px top and bottom padding. */}
        <div className="pt-[calc(4.5rem+env(safe-area-inset-top))]">
          {view === "timeline" && (
            <Timeline key={refreshKey} onViewProfile={setViewedUserId} onViewEvents={() => setView("events")} />
          )}
          {view === "grid" && <DiscoveryGrid key={refreshKey} onViewProfile={setViewedUserId} />}
          {view === "events" && <EventsScreen key={refreshKey} onViewProfile={setViewedUserId} />}
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
