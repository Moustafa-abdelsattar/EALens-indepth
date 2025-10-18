import React, { useState, useMemo, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, FileSpreadsheet, Loader2, CheckCircle, TrendingUp, DollarSign, Target, Users } from "lucide-react";
import { TeamsTable } from "@/components/TeamsTable";
import { TeamMetrics, TeamSortField, SortDirection } from "@/types/teamsData";
import { SalesData } from "@/types/salesData";
import { parseSalesDataFromExcel } from "@/utils/salesDataUtils";
import {
  aggregateTeamMetrics,
  filterTeamsBySearch,
  sortTeams,
  formatCurrency,
  formatPercentage,
} from "@/utils/teamsDataUtils";
import { toast } from "@/hooks/use-toast";

const TeamsOverview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<TeamSortField>('cashTargetAchieved');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
          variant: "destructive"
        });
        return;
      }

      setUploadedFile(file);
      setIsProcessed(false);
      setSalesData([]);
      toast({
        title: "File selected",
        description: `${file.name} is ready to process`,
      });
    }
  };

  // Handle file processing
  const handleProcessFile = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const parsedData = await parseSalesDataFromExcel(uploadedFile);

      if (parsedData.length === 0) {
        toast({
          title: "No data found",
          description: "The Excel file appears to be empty or improperly formatted",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      setSalesData(parsedData);
      setIsProcessed(true);

      toast({
        title: "File processed successfully",
        description: `Loaded ${parsedData.length} sales records from ${uploadedFile.name}`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing error",
        description: "Failed to process the Excel file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear uploaded data
  const handleClearData = () => {
    setSalesData([]);
    setUploadedFile(null);
    setIsProcessed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Data cleared",
      description: "Upload a new file to analyze team performance",
    });
  };

  // Aggregate to team metrics
  const teamMetrics = useMemo(() => {
    return aggregateTeamMetrics(salesData);
  }, [salesData]);

  // Handle sorting
  const handleSort = (field: TeamSortField) => {
    if (sortBy === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort
  const filteredAndSortedTeams = useMemo(() => {
    let filtered = filterTeamsBySearch(teamMetrics, searchTerm);
    filtered = sortTeams(filtered, sortBy, sortDirection);
    return filtered;
  }, [teamMetrics, searchTerm, sortBy, sortDirection]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (filteredAndSortedTeams.length === 0) {
      return {
        totalTeams: 0,
        avgCashAchievement: 0,
        avgContractAchievement: 0,
        totalRevenue: 0,
        totalTargetCash: 0,
      };
    }

    return {
      totalTeams: filteredAndSortedTeams.length,
      avgCashAchievement: filteredAndSortedTeams.reduce((sum, t) => sum + t.cashTargetAchieved, 0) / filteredAndSortedTeams.length,
      avgContractAchievement: filteredAndSortedTeams.reduce((sum, t) => sum + t.contractTargetAchieved, 0) / filteredAndSortedTeams.length,
      totalRevenue: filteredAndSortedTeams.reduce((sum, t) => sum + t.cashTotal, 0),
      totalTargetCash: filteredAndSortedTeams.reduce((sum, t) => sum + t.totalTargetCash, 0),
    };
  }, [filteredAndSortedTeams]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Teams Overview
        </h1>
        <p className="text-muted-foreground">
          Track and analyze team performance, targets, and achievements across all teams
        </p>
      </div>

      {/* Upload Section */}
      <Card className="glass-card p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Upload Sales Data
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload your Excel file (.xlsx) with activation sheet data
              </p>
            </div>
            {isProcessed && (
              <Button
                variant="outline"
                onClick={handleClearData}
                className="text-red-600 hover:text-red-700"
              >
                Clear Data
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="teams-file-upload"
            />
            <label htmlFor="teams-file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {uploadedFile ? 'Change File' : 'Select File'}
                </span>
              </Button>
            </label>

            {uploadedFile && (
              <>
                <div className="flex-1 px-4 py-2 bg-muted rounded-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </span>
                </div>

                <Button
                  onClick={handleProcessFile}
                  disabled={isProcessing || isProcessed}
                  className="min-w-[140px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isProcessed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Processed
                    </>
                  ) : (
                    'Process File'
                  )}
                </Button>
              </>
            )}
          </div>

          {isProcessed && salesData.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Successfully loaded {salesData.length} sales records from {uploadedFile?.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Show content only after processing */}
      {isProcessed && salesData.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">{summaryStats.totalTeams}</div>
              <div className="text-sm text-muted-foreground">Total Teams</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{formatPercentage(summaryStats.avgCashAchievement)}</div>
              <div className="text-sm text-muted-foreground">Avg Cash Achievement</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(summaryStats.avgContractAchievement)}</div>
              <div className="text-sm text-muted-foreground">Avg Contract Achievement</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(summaryStats.totalRevenue)}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summaryStats.totalTargetCash)}</div>
              <div className="text-sm text-muted-foreground">Total Target Cash</div>
            </Card>
          </div>

          {/* Search */}
          <Card className="glass-card p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-card"
              />
            </div>
          </Card>

          {/* Teams Table */}
          {filteredAndSortedTeams.length > 0 ? (
            <TeamsTable
              teams={filteredAndSortedTeams}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          ) : (
            <Card className="glass-card p-12 text-center">
              <div className="space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No teams found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search terms to find teams
                </p>
                <Button
                  onClick={() => setSearchTerm("")}
                  variant="outline"
                >
                  Clear Search
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!isProcessed && !uploadedFile && (
        <Card className="glass-card p-12 text-center">
          <div className="space-y-4">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-semibold">No Data Loaded</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upload an Excel file with sales activation data to start analyzing team performance
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamsOverview;
