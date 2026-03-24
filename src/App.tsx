import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider, useLanguage } from "@/hooks/useLanguage";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import KanbanPage from "@/pages/KanbanPage";
import JobsPage from "@/pages/JobsPage";
import CandidatesPage from "@/pages/CandidatesPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  const { t } = useLanguage();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t.loading}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t.loading}</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
              <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
