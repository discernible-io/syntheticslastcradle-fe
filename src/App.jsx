import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { WatchLobbyPage } from "./pages/WatchLobbyPage.jsx";
import { ArenaPage } from "./pages/ArenaPage.jsx";
import { TurnRecapPage } from "./pages/TurnRecapPage.jsx";
import { ContestsPage } from "./pages/ContestsPage.jsx";
import { HallOfFamePage } from "./pages/HallOfFamePage.jsx";
import { EnrollPage } from "./pages/EnrollPage.jsx";
import { OperatorPage } from "./pages/OperatorPage.jsx";
import { env } from "./config/env.js";
import { useEffect } from "react";

function TitleSync() {
  const loc = useLocation();
  useEffect(() => {
    document.title = env.title;
  }, [loc.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <TitleSync />
      <Routes>
        <Route
          path="/"
          element={
            <AppShell bleed>
              <LandingPage />
            </AppShell>
          }
        />
        <Route
          path="/watch"
          element={
            <AppShell>
              <WatchLobbyPage />
            </AppShell>
          }
        />
        <Route
          path="/watch/:gameId"
          element={
            <AppShell bleed>
              <ArenaPage />
            </AppShell>
          }
        />
        <Route
          path="/watch/:gameId/turn/:turn"
          element={
            <AppShell>
              <TurnRecapPage />
            </AppShell>
          }
        />
        <Route
          path="/contests"
          element={
            <AppShell>
              <ContestsPage />
            </AppShell>
          }
        />
        <Route
          path="/hall-of-fame"
          element={
            <AppShell>
              <HallOfFamePage />
            </AppShell>
          }
        />
        <Route
          path="/enroll"
          element={
            <AppShell>
              <EnrollPage />
            </AppShell>
          }
        />
        <Route
          path="/operator"
          element={
            <AppShell>
              <OperatorPage />
            </AppShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
