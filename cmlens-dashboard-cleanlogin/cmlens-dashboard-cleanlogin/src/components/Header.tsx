import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleName } from "@/types/user";
import cmlensLogo from "@/assets/cmlens-eye-logo.webp";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const isUploadPage = location.pathname === "/upload";
  const isPerformancePage = location.pathname === "/performance";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <header className="bg-glass/80 backdrop-blur-xl border-b border-glass-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <img src={cmlensLogo} alt="CMLens Logo" className="h-8 w-8" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              CMLens
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Button
              variant={isUploadPage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/upload")}
              className={isUploadPage ? "btn-hero" : ""}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload & Targets
            </Button>
            <Button
              variant={isPerformancePage ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("/performance")}
              className={isPerformancePage ? "btn-hero" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </Button>
          </nav>
        </div>

        {/* User info and logout */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <div className="flex flex-col">
              <span>{currentUser?.displayName || currentUser?.email}</span>
              {currentUser?.role !== undefined && (
                <span className="text-xs text-primary font-medium">
                  {getRoleName(currentUser.role)}
                  {currentUser.teamName && ` - ${currentUser.teamName}`}
                </span>
              )}
            </div>
          </div>
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
      </div>
    </header>
  );
};

export default Header;