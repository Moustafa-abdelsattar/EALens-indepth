import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ReportIssueFooter } from "@/components/ReportIssueFooter";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types/user";
import { queryClient } from "@/lib/queryClient";
import Homepage from "./pages/Homepage";
import AgentCallsPage from "./pages/AgentCalls";
import SalesPerformancePage from "./pages/SalesPerformance";
import TeamsOverview from "./pages/TeamsOverview";
import Login from "@/components/auth/Login";
import Signup from "@/components/auth/Signup";
import ForgotPassword from "@/components/auth/ForgotPassword";
import NotFound from "./pages/NotFound";
import { Calendar, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getRoleName } from "@/types/user";

// Role-based home redirect component
const RoleBasedHome = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // All users go to homepage
  return <Navigate to="/homepage" replace />;
};

// Layout wrapper that can use router hooks
const AppLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, logout } = useAuth();
  
  // Get current date in a nice format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-foreground">EA Lens Dashboard</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                <Calendar className="h-4 w-4" />
                <span>{getCurrentDate()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {currentUser && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{currentUser.displayName || currentUser.email}</span>
                    {currentUser.role !== undefined && (
                      <span className="text-xs text-primary font-medium">
                        {getRoleName(currentUser.role)}
                        {currentUser.teamName && ` - ${currentUser.teamName}`}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <ReportIssueFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes with role-based access */}
            <Route path="/homepage" element={
              <ProtectedRoute allowedRoles={[UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER]}>
                <AppLayoutWrapper>
                  <Homepage />
                </AppLayoutWrapper>
              </ProtectedRoute>
            } />
            <Route path="/agent-calls" element={
              <ProtectedRoute allowedRoles={[UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER]}>
                <AppLayoutWrapper>
                  <AgentCallsPage />
                </AppLayoutWrapper>
              </ProtectedRoute>
            } />
            <Route path="/sales-performance" element={
              <ProtectedRoute allowedRoles={[UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER]}>
                <AppLayoutWrapper>
                  <SalesPerformancePage />
                </AppLayoutWrapper>
              </ProtectedRoute>
            } />
            <Route path="/teams-overview" element={
              <ProtectedRoute allowedRoles={[UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER]}>
                <AppLayoutWrapper>
                  <TeamsOverview />
                </AppLayoutWrapper>
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute allowedRoles={[UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER]}>
                <RoleBasedHome />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
