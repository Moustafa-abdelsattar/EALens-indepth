import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, Mail, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ealensLogo from '@/assets/ealens-logo.svg';

interface PermissionDeniedProps {
  message?: string;
}

export default function PermissionDenied({ message }: PermissionDeniedProps) {
  const { logout, currentUser } = useAuth();

  const defaultMessage = "You don't have permission to access this area. Your account may need approval or additional permissions.";
  const displayMessage = message || defaultMessage;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleContactSupport = () => {
    const email = 'support@ealens.com';
    const subject = encodeURIComponent('Access Request - EALens Dashboard');
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request access to the EALens Dashboard.\n\nMy account details:\n- Email: ${currentUser?.email}\n- User ID: ${currentUser?.uid}\n\nPlease grant me the appropriate permissions.\n\nThank you!`
    );
    
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={ealensLogo} alt="EALens Logo" className="h-16 w-16 mr-3" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              EALens
            </h1>
          </div>
        </div>

        <Card className="border-red-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-700 text-xl">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                {displayMessage}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Account Information:</h3>
              <div className="text-sm text-red-700 space-y-1">
                <p><strong>Email:</strong> {currentUser?.email}</p>
                <p><strong>Status:</strong> Pending Access Approval</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleContactSupport}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Request Access
              </Button>
              
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Contact your administrator to get the appropriate role assigned to your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}