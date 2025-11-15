import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import MedicineManagement from "./pages/MedicineManagement";
import Voucher from "./pages/Voucher";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NavBar from "./components/NavBar";
import { ChatPanel } from "./components/ChatPanel";
import { AuthProvider } from "./hooks/useAuth";
import ReviewSubmissions from "./pages/SubmissionApproval";
import Forum from "./pages/Forum";
import AdminDashboard from "./pages/AdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/submit"
              element={
                <ProtectedRoute>
                  <MedicineManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voucher"
              element={
                <ProtectedRoute>
                  <Voucher />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRoles={["ADMIN", "CONGTACVIEN"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forum" element={<Forum />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatPanel />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Global fetch wrapper: catch network failures (e.g. from third-party scripts) and return a safe non-ok Response
const container = document.getElementById("root")!;
const win = window as any;

if (typeof window !== "undefined") {
  // suppress noisy unhandled fetch errors (e.g. from embedded FullStory)
  window.addEventListener("unhandledrejection", (ev) => {
    try {
      const reason = (ev as any).reason;
      if (
        reason &&
        (String(reason).includes("Failed to fetch") ||
          reason?.message?.includes("Failed to fetch"))
      ) {
        ev.preventDefault();
        console.debug("Suppressed unhandledrejection: Failed to fetch");
      }
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener("error", (ev) => {
    try {
      const msg = (ev as any).message || "";
      if (String(msg).includes("Failed to fetch")) {
        ev.preventDefault();
        console.debug("Suppressed window.error: Failed to fetch");
      }
    } catch (e) {
      // ignore
    }
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: any[]) => {
    try {
      return await originalFetch(...args);
    } catch (err) {
      // Log once for debugging but avoid throwing to third-party wrappers
      console.warn("Suppressed fetch error (network or third-party):", err);
      // Return a Response-like object with ok=false so callers can handle it
      const body = JSON.stringify({ error: "network_error" });
      return new Response(body, {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

if (!win.__REACT_ROOT__) {
  win.__REACT_ROOT__ = createRoot(container);
}
win.__REACT_ROOT__.render(<App />);
