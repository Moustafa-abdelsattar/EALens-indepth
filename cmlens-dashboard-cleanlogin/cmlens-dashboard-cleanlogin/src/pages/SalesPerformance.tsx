import React, { useState, useMemo, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Upload, FileSpreadsheet, Loader2, CheckCircle, TrendingUp, DollarSign, Target, Users } from "lucide-react";
import AgentSalesCard from "@/components/AgentSalesCard";
import { SalesData, AgentSalesProfile } from "@/types/salesData";
import { parseSalesDataFromExcel, convertToAgentProfile, filterAgentsBySearch, sortAgents } from "@/utils/salesDataUtils";
import { toast } from "@/hooks/use-toast";

const SalesPerformancePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'cash_achievement' | 'contract_achievement' | 'total_cash' | 'team'>('cash_achievement');
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
      description: "Upload a new file to analyze sales performance",
    });
  };

  // Convert to profiles
  const agentProfiles = useMemo(() => {
    return salesData.map(convertToAgentProfile);
  }, [salesData]);

  // Filter and sort
  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = filterAgentsBySearch(agentProfiles, searchTerm);
    filtered = sortAgents(filtered, sortBy);
    return filtered;
  }, [agentProfiles, searchTerm, sortBy]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (filteredAndSortedProfiles.length === 0) {
      return {
        totalAgents: 0,
        avgCashAchievement: 0,
        avgContractAchievement: 0,
        totalRevenue: 0,
        totalContracts: 0,
      };
    }

    return {
      totalAgents: filteredAndSortedProfiles.length,
      avgCashAchievement: filteredAndSortedProfiles.reduce((sum, p) => sum + p.performance_metrics.cash_achievement, 0) / filteredAndSortedProfiles.length,
      avgContractAchievement: filteredAndSortedProfiles.reduce((sum, p) => sum + p.performance_metrics.contract_achievement, 0) / filteredAndSortedProfiles.length,
      totalRevenue: filteredAndSortedProfiles.reduce((sum, p) => sum + p.performance_metrics.total_cash, 0),
      totalContracts: filteredAndSortedProfiles.reduce((sum, p) => sum + p.performance_metrics.total_contracts, 0),
    };
  }, [filteredAndSortedProfiles]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Sales Performance
        </h1>
        <p className="text-muted-foreground">
          Track and analyze agent sales performance, targets, and achievements
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
              id="sales-file-upload"
            />
            <label htmlFor="sales-file-upload">
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
              <div className="text-2xl font-bold text-primary">{summaryStats.totalAgents}</div>
              <div className="text-sm text-muted-foreground">Total Agents</div>
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
                <FileSpreadsheet className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{summaryStats.totalContracts}</div>
              <div className="text-sm text-muted-foreground">Total Contracts</div>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents by name or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 glass-card"
                  />
                </div>
              </div>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="glass-card">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_achievement">Cash Achievement</SelectItem>
                  <SelectItem value="contract_achievement">Contract Achievement</SelectItem>
                  <SelectItem value="total_cash">Total Cash</SelectItem>
                  <SelectItem value="name">Agent Name</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Agent Cards Grid */}
          {filteredAndSortedProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedProfiles.map((profile) => (
                <AgentSalesCard
                  key={profile.agent_name}
                  profile={profile}
                  onClick={() => {
                    console.log('Clicked agent:', profile.agent_name);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="glass-card p-12 text-center">
              <div className="space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No agents found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search terms to find agents
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
              Upload an Excel file with sales activation data to start analyzing agent performance
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SalesPerformancePage;
