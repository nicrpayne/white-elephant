import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import AdminDashboard from "./components/AdminDashboard";
import GameBoard from "./components/GameBoard";
import JoinGame from "./components/JoinGame";
import routes from "tempo-routes";

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
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;