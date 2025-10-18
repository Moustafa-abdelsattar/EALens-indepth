import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, TrendingUp, Users, Target, BarChart3, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import AgentDetailModal from "@/components/AgentDetailModal";

// Import AgentData type
import { AgentData } from "@/services/api";

const API_BASE_URL = import.meta.env.PROD
  ? 'https://cmlens-dashboard-production.up.railway.app'
  : 'http://localhost:8080';

// Fetch agent data from API (filtered by team automatically for Team Viewers)
const fetchAgentsData = async (): Promise<AgentData[]> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found');
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/agent-data`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch agent data:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('✅ Fetched agent data from API:', data.length, 'agents');

    // Map API response to AgentData format
    if (Array.isArray(data)) {
      return data.map((agent: any) => ({
        id: agent.id || agent.name || 'unknown',
        name: agent.name || agent.id || 'Unknown',
        team: agent.team || '',
        group: agent.group || '',
        students: agent.students || 0,
        ccPct: agent.ccPct,
        scPct: agent.scPct,
        upPct: agent.upPct,
        fixedPct: agent.fixedPct,
        referralLeads: agent.referralLeads || 0,
        referralShowups: agent.referralShowups || 0,
        referralPaid: agent.referralPaid || 0,
        referralAchPct: agent.referralAchPct,
        conversionRate: agent.conversionRate,
        totalLeads: agent.totalLeads || 0,
        recoveredLeads: agent.recoveredLeads || 0,
        unrecoveredLeads: agent.unrecoveredLeads || 0,
        unrecoveredStudents: agent.unrecoveredStudents || [],
      })) as AgentData[];
    }

    return [];
  } catch (error) {
    console.error('Error fetching agent data:', error);
    return [];
  }
};

const AgentsPerformance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("students");
  
  // Individual target filters
  const [fixedFilter, setFixedFilter] = useState("all");
  const [ccFilter, setCcFilter] = useState("all");
  const [scFilter, setScFilter] = useState("all");
  const [upFilter, setUpFilter] = useState("all");
  const [targetsAchievedFilter, setTargetsAchievedFilter] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTargetsConfig, setShowTargetsConfig] = useState(false);

  const openAgentDetail = (agent: AgentData) => {
    console.log('Opening agent detail for:', agent);
    console.log('Agent fields check:', {
      id: agent.id,
      fixedPct: agent.fixedPct,
      ccPct: agent.ccPct,
      scPct: agent.scPct,
      upPct: agent.upPct,
      referralAchPct: agent.referralAchPct,
      conversionRate: agent.conversionRate,
      totalLeads: agent.totalLeads,
      recoveredLeads: agent.recoveredLeads
    });
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const closeAgentDetail = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  // State for agents data and loading
  const [agentsData, setAgentsData] = useState<AgentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch agents data from API on component mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      const data = await fetchAgentsData();
      setAgentsData(data);
      setIsLoadingData(false);
      console.log('✅ Agents data loaded:', data.length, 'agents');
    }
    loadData();
  }, []);

  // Get targets from localStorage (now editable)
  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem("cmlens_targets");
    return saved ? JSON.parse(saved) : {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
      referralAchievement: 80, // Target for referral achievement %
      conversionRate: 30, // Target for conversion rate %
    };
  });

  // Get weights from localStorage (now editable)
  const [weights, setWeights] = useState(() => {
    const saved = localStorage.getItem("cmlens_weights");
    return saved ? JSON.parse(saved) : {
      classConsumption: 25,
      superClassConsumption: 25,
      upgradeRate: 25,
      fixedRate: 25,
    };
  });

  // Save targets and weights functions
  const saveTargetsAndWeights = () => {
    localStorage.setItem("cmlens_targets", JSON.stringify(targets));
    localStorage.setItem("cmlens_weights", JSON.stringify(weights));
    toast({
      title: "Configuration saved",
      description: "Performance targets and weights have been saved successfully",
    });
  };

  const resetTargetsAndWeights = () => {
    const defaultTargets = {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
      referralAchievement: 80,
      conversionRate: 30,
    };
    const defaultWeights = {
      classConsumption: 25,
      superClassConsumption: 25,
      upgradeRate: 25,
      fixedRate: 25,
    };
    setTargets(defaultTargets);
    setWeights(defaultWeights);
    localStorage.setItem("cmlens_targets", JSON.stringify(defaultTargets));
    localStorage.setItem("cmlens_weights", JSON.stringify(defaultWeights));
    toast({
      title: "Configuration reset",
      description: "Performance targets and weights have been reset to defaults",
    });
  };

  // Helper function to get status vs target
  const getStatus = (value: number | null, target: number) => {
    if (value === null) return "na";
    if (value >= target) return "above";
    if (value >= target * 0.9) return "warning";
    return "below";
  };

  // Function to count targets achieved by an agent
  const countTargetsAchieved = (agent: AgentData) => {
    let achieved = 0;
    if (getStatus(agent.fixedPct, targets.fixedRate) === "above") achieved++;
    if (getStatus(agent.ccPct, targets.classConsumption) === "above") achieved++;
    if (getStatus(agent.scPct, targets.superClassConsumption) === "above") achieved++;
    if (getStatus(agent.upPct, targets.upgradeRate) === "above") achieved++;
    // Note: Referral % and Conversion Rate don't have targets, so they're not included in achievement count
    return achieved;
  };

  // Calculate weighted score for ranking (consistent with TeamAnalytics)
  const calculateScore = (agent: AgentData) => {
    let weightedScore = 0;
    let totalAvailableWeight = 0;

    if (agent.fixedPct !== null) {
      weightedScore += ((agent.fixedPct / targets.fixedRate) * 100) * (weights.fixedRate / 100);
      totalAvailableWeight += weights.fixedRate;
    }
    if (agent.ccPct !== null) {
      weightedScore += ((agent.ccPct / targets.classConsumption) * 100) * (weights.classConsumption / 100);
      totalAvailableWeight += weights.classConsumption;
    }
    if (agent.scPct !== null) {
      weightedScore += ((agent.scPct / targets.superClassConsumption) * 100) * (weights.superClassConsumption / 100);
      totalAvailableWeight += weights.superClassConsumption;
    }
    if (agent.upPct !== null) {
      weightedScore += ((agent.upPct / targets.upgradeRate) * 100) * (weights.upgradeRate / 100);
      totalAvailableWeight += weights.upgradeRate;
    }
    
    // Normalize to available weight percentage
    return totalAvailableWeight > 0 ? (weightedScore / (totalAvailableWeight / 100)) : 0;
  };

  // Function to get agent rank within filtered set
  const getAgentRank = (agentId: string, filteredAgents: AgentData[]) => {
    const agentsWithScores = filteredAgents.map(agent => ({
      ...agent,
      weightedScore: calculateScore(agent)
    }));
    
    // Sort by weighted score (descending) then assign ranks
    const sortedByScore = [...agentsWithScores].sort((a, b) => b.weightedScore - a.weightedScore);
    
    const rankIndex = sortedByScore.findIndex(a => a.id === agentId);
    return rankIndex >= 0 ? rankIndex + 1 : 0;
  };

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let filtered = agentsData.filter(agent => {
      const matchesSearch = 
        agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.group.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = teamFilter === "all" || agent.team.includes(teamFilter);
      const matchesGroup = groupFilter === "all" || agent.group.includes(groupFilter);
      
      let matchesStatus = true;
      if (statusFilter !== "all") {
        const fixedStatus = getStatus(agent.fixedPct, targets.fixedRate);
        const ccStatus = getStatus(agent.ccPct, targets.classConsumption);
        const scStatus = getStatus(agent.scPct, targets.superClassConsumption);
        const upStatus = getStatus(agent.upPct, targets.upgradeRate);
        
        const hasAbove = [fixedStatus, ccStatus, scStatus, upStatus].includes("above");
        const hasBelow = [fixedStatus, ccStatus, scStatus, upStatus].includes("below");
        const hasWarning = [fixedStatus, ccStatus, scStatus, upStatus].includes("warning");
        
        if (statusFilter === "above" && !hasAbove) matchesStatus = false;
        if (statusFilter === "below" && !hasBelow) matchesStatus = false;
        if (statusFilter === "warning" && !hasWarning) matchesStatus = false;
      }

      // Individual target filters
      let matchesTargetFilters = true;
      
      // Fixed Rate filter
      if (fixedFilter !== "all") {
        const fixedStatus = getStatus(agent.fixedPct, targets.fixedRate);
        if (fixedFilter !== fixedStatus) matchesTargetFilters = false;
      }
      
      // Class Consumption filter
      if (ccFilter !== "all") {
        const ccStatus = getStatus(agent.ccPct, targets.classConsumption);
        if (ccFilter !== ccStatus) matchesTargetFilters = false;
      }
      
      // Super Class filter
      if (scFilter !== "all") {
        const scStatus = getStatus(agent.scPct, targets.superClassConsumption);
        if (scFilter !== scStatus) matchesTargetFilters = false;
      }
      
      // Upgrade Rate filter
      if (upFilter !== "all") {
        const upStatus = getStatus(agent.upPct, targets.upgradeRate);
        if (upFilter !== upStatus) matchesTargetFilters = false;
      }
      
      // Targets Achieved filter
      if (targetsAchievedFilter !== "all") {
        const achieved = countTargetsAchieved(agent);
        if (targetsAchievedFilter === "0" && achieved !== 0) matchesTargetFilters = false;
        if (targetsAchievedFilter === "1" && achieved !== 1) matchesTargetFilters = false;
        if (targetsAchievedFilter === "2" && achieved !== 2) matchesTargetFilters = false;
        if (targetsAchievedFilter === "3" && achieved !== 3) matchesTargetFilters = false;
        if (targetsAchievedFilter === "4" && achieved !== 4) matchesTargetFilters = false;
        if (targetsAchievedFilter === "3+" && achieved < 3) matchesTargetFilters = false;
      }
      
      return matchesSearch && matchesTeam && matchesGroup && matchesStatus && matchesTargetFilters;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "students":
          return b.students - a.students;
        case "ccPct":
          return (b.ccPct || 0) - (a.ccPct || 0);
        case "scPct":
          return (b.scPct || 0) - (a.scPct || 0);
        case "fixedPct":
          return (b.fixedPct || 0) - (a.fixedPct || 0);
        case "upPct":
          return (b.upPct || 0) - (a.upPct || 0);
        case "targetsAchieved":
          return countTargetsAchieved(b) - countTargetsAchieved(a);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, teamFilter, groupFilter, statusFilter, sortBy, targets, agentsData, fixedFilter, ccFilter, scFilter, upFilter, targetsAchievedFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const validCC = filteredAgents.filter(a => a.ccPct !== null);
    const validSC = filteredAgents.filter(a => a.scPct !== null);
    const validFixed = filteredAgents.filter(a => a.fixedPct !== null);
    const validUP = filteredAgents.filter(a => a.upPct !== null);
    
    return {
      avgCC: validCC.length ? validCC.reduce((sum, a) => sum + a.ccPct!, 0) / validCC.length : 0,
      avgSC: validSC.length ? validSC.reduce((sum, a) => sum + a.scPct!, 0) / validSC.length : 0,
      avgFixed: validFixed.length ? validFixed.reduce((sum, a) => sum + a.fixedPct!, 0) / validFixed.length : 0,
      avgUP: validUP.length ? validUP.reduce((sum, a) => sum + a.upPct!, 0) / validUP.length : 0,
    };
  }, [filteredAgents]);

  // Get unique teams and groups for filters (filter out empty strings)
  const teams = Array.from(new Set(agentsData.map(a => a.team).filter(team => team && team.trim() !== "")));
  const groups = Array.from(new Set(agentsData.map(a => a.group).filter(group => group && group.trim() !== "")));

  const getStatusColor = (value: number | null, target: number) => {
    const status = getStatus(value, target);
    switch (status) {
      case "above": return "status-success";
      case "warning": return "status-warning";
      case "below": return "status-danger";
      default: return "status-neutral";
    }
  };

  const formatPercent = (value: number | null | undefined) => {
    return (value !== null && value !== undefined) ? `${value.toFixed(1)}%` : "N/A";
  };

  // Debug agent data when component loads
  React.useEffect(() => {
    if (agentsData && agentsData.length > 0) {
      console.log('AgentsPerformance Debug - First 3 agents data:');
      agentsData.slice(0, 3).forEach((agent, index) => {
        console.log(`Agent ${index + 1}:`, {
          name: agent.name,
          referralAchPct: agent.referralAchPct,
          referralAchPctType: typeof agent.referralAchPct,
          conversionRate: agent.conversionRate,
          conversionRateType: typeof agent.conversionRate,
          allFields: agent
        });
      });
    }
  }, [agentsData]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
          Agents Performance
        </h1>
        <p className="text-muted-foreground">
          Track and analyze agent performance metrics with real-time insights
        </p>
      </div>

      {/* Targets Configuration Card */}
      <Card className="glass-card">
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={() => setShowTargetsConfig(!showTargetsConfig)}
        >
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Performance Targets & Weights Configuration</h3>
              <p className="text-sm text-muted-foreground">Click to {showTargetsConfig ? 'hide' : 'show'} configuration options</p>
            </div>
          </div>
          {showTargetsConfig ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>

        {showTargetsConfig && (
          <div className="p-6 border-t space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Targets Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Performance Targets</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Class Consumption</Label>
                    <span className="text-sm font-medium text-primary">{targets.classConsumption}%</span>
                  </div>
                  <Slider
                    value={[targets.classConsumption]}
                    onValueChange={(value) => setTargets(prev => ({...prev, classConsumption: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Super Class Consumption</Label>
                    <span className="text-sm font-medium text-primary">{targets.superClassConsumption}%</span>
                  </div>
                  <Slider
                    value={[targets.superClassConsumption]}
                    onValueChange={(value) => setTargets(prev => ({...prev, superClassConsumption: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upgrade Rate</Label>
                    <span className="text-sm font-medium text-primary">{targets.upgradeRate}%</span>
                  </div>
                  <Slider
                    value={[targets.upgradeRate]}
                    onValueChange={(value) => setTargets(prev => ({...prev, upgradeRate: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fixed Rate</Label>
                    <span className="text-sm font-medium text-primary">{targets.fixedRate}%</span>
                  </div>
                  <Slider
                    value={[targets.fixedRate]}
                    onValueChange={(value) => setTargets(prev => ({...prev, fixedRate: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* Weights Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Performance Weights</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Class Consumption Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.classConsumption}%</span>
                  </div>
                  <Slider
                    value={[weights.classConsumption]}
                    onValueChange={(value) => setWeights(prev => ({...prev, classConsumption: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Super Class Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.superClassConsumption}%</span>
                  </div>
                  <Slider
                    value={[weights.superClassConsumption]}
                    onValueChange={(value) => setWeights(prev => ({...prev, superClassConsumption: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upgrade Rate Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.upgradeRate}%</span>
                  </div>
                  <Slider
                    value={[weights.upgradeRate]}
                    onValueChange={(value) => setWeights(prev => ({...prev, upgradeRate: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fixed Rate Weight</Label>
                    <span className="text-sm font-medium text-primary">{weights.fixedRate}%</span>
                  </div>
                  <Slider
                    value={[weights.fixedRate]}
                    onValueChange={(value) => setWeights(prev => ({...prev, fixedRate: value[0]}))}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total Weight:</span>
                    <span className={`font-bold ${
                      (weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate) === 100
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      {weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate}%
                    </span>
                  </div>
                  {(weights.classConsumption + weights.superClassConsumption + weights.upgradeRate + weights.fixedRate) !== 100 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Weights should total 100% for accurate scoring
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button onClick={saveTargetsAndWeights} className="flex-1">
                Save Configuration
              </Button>
              <Button onClick={resetTargetsAndWeights} variant="outline" className="flex-1">
                Reset to Defaults
              </Button>
            </div>
          </div>
        )}
      </Card>

          {/* Filters */}
          <Card className="glass-card p-6">
            <div className="space-y-4">
              {/* Primary Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
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
                
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Overall Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="above">Above Target</SelectItem>
                    <SelectItem value="warning">On Target</SelectItem>
                    <SelectItem value="below">Below Target</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="targetsAchieved">Targets Achieved</SelectItem>
                    <SelectItem value="students">Students Count</SelectItem>
                    <SelectItem value="fixedPct">Fixed Rate %</SelectItem>
                    <SelectItem value="ccPct">Class Consumption %</SelectItem>
                    <SelectItem value="scPct">Super Class %</SelectItem>
                    <SelectItem value="upPct">Upgrade Rate %</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target-Specific Filters */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Target-Specific Filters</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Select value={fixedFilter} onValueChange={setFixedFilter}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Fixed Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fixed</SelectItem>
                      <SelectItem value="above">Above Target</SelectItem>
                      <SelectItem value="warning">Near Target</SelectItem>
                      <SelectItem value="below">Below Target</SelectItem>
                      <SelectItem value="na">No Data</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={ccFilter} onValueChange={setCcFilter}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Class Consumption" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All CC</SelectItem>
                      <SelectItem value="above">Above Target</SelectItem>
                      <SelectItem value="warning">Near Target</SelectItem>
                      <SelectItem value="below">Below Target</SelectItem>
                      <SelectItem value="na">No Data</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={scFilter} onValueChange={setScFilter}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Super Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All SC</SelectItem>
                      <SelectItem value="above">Above Target</SelectItem>
                      <SelectItem value="warning">Near Target</SelectItem>
                      <SelectItem value="below">Below Target</SelectItem>
                      <SelectItem value="na">No Data</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={upFilter} onValueChange={setUpFilter}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Upgrade Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All UP</SelectItem>
                      <SelectItem value="above">Above Target</SelectItem>
                      <SelectItem value="warning">Near Target</SelectItem>
                      <SelectItem value="below">Below Target</SelectItem>
                      <SelectItem value="na">No Data</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={targetsAchievedFilter} onValueChange={setTargetsAchievedFilter}>
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Targets Achieved" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counts</SelectItem>
                      <SelectItem value="4">4 Targets</SelectItem>
                      <SelectItem value="3">3 Targets</SelectItem>
                      <SelectItem value="3+">3+ Targets</SelectItem>
                      <SelectItem value="2">2 Targets</SelectItem>
                      <SelectItem value="1">1 Target</SelectItem>
                      <SelectItem value="0">0 Targets</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setTeamFilter("all");
                      setGroupFilter("all");
                      setStatusFilter("all");
                      setFixedFilter("all");
                      setCcFilter("all");
                      setScFilter("all");
                      setUpFilter("all");
                      setTargetsAchievedFilter("all");
                    }}
                    className="glass-card"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="h-6 w-6 text-success" />
              </div>
              <div className="text-2xl font-bold">{summaryStats.avgCC.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg CC%</div>
            </Card>

            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <div className="text-2xl font-bold">{summaryStats.avgSC.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg SC%</div>
            </Card>

            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-danger" />
              </div>
              <div className="text-2xl font-bold">{summaryStats.avgFixed.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Fixed%</div>
            </Card>

            <Card className="glass-card p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <div className="text-2xl font-bold">{summaryStats.avgUP.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg UP%</div>
            </Card>
          </div>

          {/* Agents Grid */}
          {isLoadingData ? (
            <Card className="glass-card p-12 text-center">
              <div className="space-y-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="text-xl font-semibold">Loading agent data...</h3>
                <p className="text-muted-foreground">Fetching performance metrics from database</p>
              </div>
            </Card>
          ) : filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 space-y-4 hover:bg-card/70 transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 
                        className="text-xl font-bold text-foreground mb-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => openAgentDetail(agent)}
                        title="Click to view detailed performance breakdown"
                      >
                        {agent.id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {agent.team} • {agent.group}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-muted-foreground">
                        Rank #{getAgentRank(agent.id, filteredAgents)}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {countTargetsAchieved(agent)}/4
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Targets
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics - 3x2 Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className={`px-3 py-2 rounded-full text-xs font-semibold text-center ${
                      getStatus(agent.fixedPct, targets.fixedRate) === 'above' ? 'bg-success text-success-foreground' :
                      getStatus(agent.fixedPct, targets.fixedRate) === 'warning' ? 'bg-warning text-warning-foreground' :
                      getStatus(agent.fixedPct, targets.fixedRate) === 'below' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      Fixed: {formatPercent(agent.fixedPct)}
                    </div>
                    <div className={`px-3 py-2 rounded-full text-xs font-semibold text-center ${
                      getStatus(agent.ccPct, targets.classConsumption) === 'above' ? 'bg-success text-success-foreground' :
                      getStatus(agent.ccPct, targets.classConsumption) === 'warning' ? 'bg-warning text-warning-foreground' :
                      getStatus(agent.ccPct, targets.classConsumption) === 'below' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      CC: {formatPercent(agent.ccPct)}
                    </div>
                    <div className={`px-3 py-2 rounded-full text-xs font-semibold text-center ${
                      getStatus(agent.scPct, targets.superClassConsumption) === 'above' ? 'bg-success text-success-foreground' :
                      getStatus(agent.scPct, targets.superClassConsumption) === 'warning' ? 'bg-warning text-warning-foreground' :
                      getStatus(agent.scPct, targets.superClassConsumption) === 'below' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      SC: {formatPercent(agent.scPct)}
                    </div>
                    <div className={`px-3 py-2 rounded-full text-xs font-semibold text-center ${
                      getStatus(agent.upPct, targets.upgradeRate) === 'above' ? 'bg-success text-success-foreground' :
                      getStatus(agent.upPct, targets.upgradeRate) === 'warning' ? 'bg-warning text-warning-foreground' :
                      getStatus(agent.upPct, targets.upgradeRate) === 'below' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      UP: {formatPercent(agent.upPct)}
                    </div>
                    <div className="px-3 py-2 rounded-full text-xs font-semibold text-center bg-muted text-muted-foreground">
                      Ref: {formatPercent(agent.referralAchPct)}
                    </div>
                    <div className="px-3 py-2 rounded-full text-xs font-semibold text-center bg-muted text-muted-foreground">
                      Conv: {formatPercent(agent.conversionRate)}
                    </div>
                  </div>

                  {/* Leads Conversion */}
                  <div className="border-t border-border pt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-3 text-center">
                      Leads Conversion
                    </div>
                    <div className="flex justify-around text-center">
                      <div>
                        <div className="text-2xl font-bold text-foreground">{agent.totalLeads || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Leads</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success">{agent.recoveredLeads || 0}</div>
                        <div className="text-xs text-muted-foreground">Recovered</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-destructive">{agent.unrecoveredLeads || 0}</div>
                        <div className="text-xs text-muted-foreground">Unrecovered</div>
                      </div>
                    </div>
                  </div>

                  {/* Referral Performance */}
                  <div className="border-t border-border pt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-3 text-center">
                      Referral Performance
                    </div>
                    <div className="flex justify-around text-center">
                      <div>
                        <div className="text-2xl font-bold text-foreground">{agent.referralLeads}</div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{agent.referralShowups}</div>
                        <div className="text-xs text-muted-foreground">Showups</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{agent.referralPaid}</div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                      </div>
                    </div>
                  </div>
                </div>
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
                    setTeamFilter("all");
                    setGroupFilter("all");
                    setStatusFilter("all");
                  }}
                  variant="outline"
                >
                  Clear All Filters
                </Button>
              </div>
            </Card>
          )}

      {/* Agent Detail Modal */}
      <AgentDetailModal 
        isOpen={isModalOpen}
        onClose={closeAgentDetail}
        agent={selectedAgent}
      />
    </div>
  );
};

export default AgentsPerformance;