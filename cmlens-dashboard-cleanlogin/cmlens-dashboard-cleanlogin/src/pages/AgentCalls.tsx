import React, { useState, useMemo, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import AgentCallCard from "@/components/AgentCallCard";
import { CallData, AgentCallMetrics } from "@/types/callData";
import { aggregateCallDataByAgent, filterAgentMetrics, sortAgentMetrics, parseCallDataFromExcel } from "@/utils/callDataUtils";
import { toast } from "@/hooks/use-toast";

// Sample data based on the structure you provided
const sampleCallData: CallData[] = [
  {
    agent_id: "AG821",
    agent_tone_sentiment: "",
    agent_turns: 4,
    call_duration_seconds: 168,
    compliance_score: 0,
    conversation_complexity: "medium",
    conversation_text: "الوكيل: السلام عليكم أروى، هنا لينا من المتابعة. أتأكد أنك بخير؟\nالعميل: وعليكم السلام، كنت أتصل عشان متابعة إعادة جدولة المحاضرة الافتراضية اللي فتحته الأسبوع الماضي.",
    customer_id: "CU2139",
    customer_turns: 4,
    detected_intent: "Follow-up",
    detected_topic_id: 1,
    detected_topic_name: "Topic_1",
    has_violation: false,
    intent_confidence: 0.45,
    processed_text: "الوكيل السلام عليكم اروي، هنا لينا من المتابعه...",
    redline_policy_1: "no",
    redline_policy_2: "no",
    redline_policy_3: "no",
    redline_policy_4: "no",
    redline_policy_5: "no",
    risk_level: "low",
    text_quality_score: 0.9166666667,
    token_count: 72,
    total_turns: 8,
    unique_tokens: 66,
  },
  {
    agent_id: "AG786",
    agent_tone_sentiment: "",
    agent_turns: 4,
    call_duration_seconds: 129,
    compliance_score: 0,
    conversation_complexity: "medium",
    conversation_text: "الوكيل: مرحباً ديما، أنا سارة من مركز بيانات المتدربين.\nالعميل: أهلاً، أبغى أعدل رقم الجوال المسجل عندكم.",
    customer_id: "CU5374",
    customer_turns: 4,
    detected_intent: "Renewal",
    detected_topic_id: 0,
    detected_topic_name: "Topic_0",
    has_violation: false,
    intent_confidence: 0.3,
    processed_text: "الوكيل مرحبا ديما، انا ساره من مركز بيانات المتدربين...",
    redline_policy_1: "no",
    redline_policy_2: "no",
    redline_policy_3: "no",
    redline_policy_4: "no",
    redline_policy_5: "no",
    risk_level: "low",
    text_quality_score: 0.8727272727,
    token_count: 55,
    total_turns: 8,
    unique_tokens: 48,
  },
  // Add more sample calls for demonstration
  {
    agent_id: "AG821",
    agent_tone_sentiment: "",
    agent_turns: 5,
    call_duration_seconds: 245,
    compliance_score: 85,
    conversation_complexity: "high",
    conversation_text: "Sample conversation...",
    customer_id: "CU3456",
    customer_turns: 6,
    detected_intent: "Complaint",
    detected_topic_id: 2,
    detected_topic_name: "Topic_2",
    has_violation: true,
    intent_confidence: 0.75,
    processed_text: "Sample processed text...",
    redline_policy_1: "yes",
    redline_policy_2: "no",
    redline_policy_3: "no",
    redline_policy_4: "no",
    redline_policy_5: "no",
    risk_level: "medium",
    text_quality_score: 0.88,
    token_count: 95,
    total_turns: 11,
    unique_tokens: 78,
  },
  {
    agent_id: "AG786",
    agent_tone_sentiment: "",
    agent_turns: 3,
    call_duration_seconds: 98,
    compliance_score: 92,
    conversation_complexity: "low",
    conversation_text: "Sample conversation...",
    customer_id: "CU7890",
    customer_turns: 3,
    detected_intent: "Inquiry",
    detected_topic_id: 1,
    detected_topic_name: "Topic_1",
    has_violation: false,
    intent_confidence: 0.88,
    processed_text: "Sample processed text...",
    redline_policy_1: "no",
    redline_policy_2: "no",
    redline_policy_3: "no",
    redline_policy_4: "no",
    redline_policy_5: "no",
    risk_level: "low",
    text_quality_score: 0.95,
    token_count: 42,
    total_turns: 6,
    unique_tokens: 39,
  },
];

const AgentCallsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'compliance' | 'quality' | 'violations' | 'calls' | 'duration'>('compliance');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [callData, setCallData] = useState<CallData[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls'
      ];

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
      setCallData([]);
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
      const parsedData = await parseCallDataFromExcel(uploadedFile);

      if (parsedData.length === 0) {
        toast({
          title: "No data found",
          description: "The Excel file appears to be empty or improperly formatted",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      setCallData(parsedData);
      setIsProcessed(true);

      toast({
        title: "File processed successfully",
        description: `Loaded ${parsedData.length} call records from ${uploadedFile.name}`,
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
    setCallData([]);
    setUploadedFile(null);
    setIsProcessed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Data cleared",
      description: "Upload a new file to analyze agent performance",
    });
  };

  // Aggregate data by agent
  const agentMetrics = useMemo(() => {
    return aggregateCallDataByAgent(callData);
  }, [callData]);

  // Filter and sort
  const filteredAndSortedMetrics = useMemo(() => {
    let filtered = agentMetrics;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(agent =>
        agent.agent_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filterAgentMetrics(filtered, { riskLevel: riskFilter });
    }

    // Sort
    filtered = sortAgentMetrics(filtered, sortBy);

    return filtered;
  }, [agentMetrics, searchTerm, sortBy, riskFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (filteredAndSortedMetrics.length === 0) {
      return {
        totalAgents: 0,
        avgCompliance: 0,
        avgQuality: 0,
        totalViolations: 0,
      };
    }

    return {
      totalAgents: filteredAndSortedMetrics.length,
      avgCompliance: filteredAndSortedMetrics.reduce((sum, m) => sum + m.avg_compliance_score, 0) / filteredAndSortedMetrics.length,
      avgQuality: filteredAndSortedMetrics.reduce((sum, m) => sum + m.avg_text_quality_score, 0) / filteredAndSortedMetrics.length,
      totalViolations: filteredAndSortedMetrics.reduce((sum, m) => sum + m.total_violations, 0),
    };
  }, [filteredAndSortedMetrics]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Agent Call Analytics
        </h1>
        <p className="text-muted-foreground">
          Monitor and analyze agent performance based on call quality and compliance metrics
        </p>
      </div>

      {/* Upload Section */}
      <Card className="glass-card p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Upload Call Data
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload your Excel file (.xlsx) with call data to analyze agent performance
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
              id="file-upload"
            />
            <label htmlFor="file-upload">
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

          {isProcessed && callData.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Successfully loaded {callData.length} call records from {new Set(callData.map(c => c.agent_id)).size} agents
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Show content only after processing */}
      {isProcessed && callData.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card p-6 text-center">
              <div className="text-2xl font-bold text-primary">{summaryStats.totalAgents}</div>
              <div className="text-sm text-muted-foreground">Total Agents</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{summaryStats.avgCompliance.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Compliance</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{(summaryStats.avgQuality * 100).toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Quality</div>
            </Card>
            <Card className="glass-card p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{summaryStats.totalViolations}</div>
              <div className="text-sm text-muted-foreground">Total Violations</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents..."
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
                  <SelectItem value="compliance">Compliance Score</SelectItem>
                  <SelectItem value="quality">Quality Score</SelectItem>
                  <SelectItem value="violations">Violations</SelectItem>
                  <SelectItem value="calls">Total Calls</SelectItem>
                  <SelectItem value="duration">Avg Duration</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riskFilter} onValueChange={(value: any) => setRiskFilter(value)}>
                <SelectTrigger className="glass-card">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Agent Cards Grid */}
          {filteredAndSortedMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedMetrics.map((metrics) => (
                <AgentCallCard
                  key={metrics.agent_id}
                  metrics={metrics}
                  onClick={() => {
                    console.log('Clicked agent:', metrics.agent_id);
                    // You can add navigation to detailed view here
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="glass-card p-12 text-center">
              <div className="space-y-4">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No agents found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your filters or search terms to find agents
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setRiskFilter("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
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
              Upload an Excel file with call data to start analyzing agent performance metrics
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgentCallsPage;
