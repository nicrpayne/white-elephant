import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import AdminDashboard from "./components/AdminDashboard";
import GameBoard from "./components/GameBoard";
import JoinGame from "./components/JoinGame";
import PresentationView from "./components/PresentationView";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<AdminDashboard />} />
          <Route path="/admin/create" element={<AdminDashboard />} />
          <Route path="/game/:sessionCode" element={<GameBoard />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/presentation/:sessionCode" element={<PresentationView />} />
          {/* Catch-all route - redirect to join (which will check for active session) */}
          <Route path="*" element={<Navigate to="/join" replace />} />
        </Routes>
        <Toaster />
      </>
    </Suspense>
  );
}

export default App;