import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Phone } from 'lucide-react';

const Calls = () => {
  const handleOpenMegaview = () => {
    window.open('https://app.megaview.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full w-full p-6">
      <div className="max-w-2xl mx-auto mt-20">
        <Card>
          <CardHeader className="text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Call Management</CardTitle>
            <CardDescription>
              Access Megaview to manage calls, review recordings, and track call performance
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={handleOpenMegaview}
              size="lg"
              className="w-full max-w-xs"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Megaview
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
                            Opens in a new tab with call management system
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calls;