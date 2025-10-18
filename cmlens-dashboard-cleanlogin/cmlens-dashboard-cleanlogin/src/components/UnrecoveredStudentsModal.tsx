import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, Download, Calendar, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnrecoveredStudent {
  studentId: string;
  noteTime: string;
}

interface UnrecoveredStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  unrecoveredStudents: UnrecoveredStudent[];
}

const UnrecoveredStudentsModal: React.FC<UnrecoveredStudentsModalProps> = ({ 
  isOpen, 
  onClose, 
  agentName, 
  unrecoveredStudents 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return unrecoveredStudents;
    
    const search = searchTerm.toLowerCase();
    return unrecoveredStudents.filter(student => 
      student.studentId.toLowerCase().includes(search) ||
      student.noteTime.toLowerCase().includes(search)
    );
  }, [unrecoveredStudents, searchTerm]);

  // Copy student IDs to clipboard
  const copyStudentIds = async () => {
    const studentIds = filteredStudents.map(s => s.studentId).join('\n');
    try {
      await navigator.clipboard.writeText(studentIds);
      toast({
        title: "Copied to clipboard",
        description: `${filteredStudents.length} student IDs copied successfully`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Export as CSV
  const exportToCsv = () => {
    const csvContent = [
      'Student ID,Last Note Time',
      ...filteredStudents.map(s => `"${s.studentId}","${s.noteTime}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unrecovered-students-${agentName.replace(/\s+/g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: `Downloaded ${filteredStudents.length} records`,
    });
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Unrecovered Students - {agentName}
          </DialogTitle>
          <DialogDescription>
            List of {unrecoveredStudents.length} students with unrecovered leads (inactive for more than 14 days)
          </DialogDescription>
        </DialogHeader>

        {/* Search and Actions Bar */}
        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Student ID or Note Time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyStudentIds}
            disabled={filteredStudents.length === 0}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy IDs
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCsv}
            disabled={filteredStudents.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredStudents.length} of {unrecoveredStudents.length} unrecovered students
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No students match your search criteria' : 'No unrecovered students found'}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredStudents.map((student, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-lg">{student.studentId}</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Unrecovered
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last Note: {formatDate(student.noteTime)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Recovery threshold: 14 days from last note</span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnrecoveredStudentsModal;