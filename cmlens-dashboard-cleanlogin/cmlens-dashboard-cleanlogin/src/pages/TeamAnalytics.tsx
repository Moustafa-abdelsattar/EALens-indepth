import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Target, TrendingUp, Users, BarChart3, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import AgentDetailModal from "@/components/AgentDetailModal";

interface AgentData {
  id: string;
  name: string;
  team: string;
  group: string;
  students: number;
  ccPct: number | null;
  scPct: number | null;
  upPct: number | null;
  fixedPct: number | null;
  referralLeads: number;
  referralShowups: number;
  referralPaid: number;
  referralAchPct: number | null;
  conversionRate: number | null;
  totalLeads: number;
  recoveredLeads: number;
  unrecoveredLeads: number;
  unrecoveredStudents: Array<{
    studentId: string;
    noteTime: string;
  }>;
}

interface TeamStats {
  teamName: string;
  totalAgents: number;
  averageScore: number;
  aboveTarget: number;
  belowTarget: number;
  agents: AgentData[];
}

const API_BASE_URL = import.meta.env.PROD
  ? 'https://cmlens-dashboard-production.up.railway.app'
  : 'http://localhost:8080';

// Fetch agent data from API (same as AgentsPerformance page)
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

const TeamAnalytics: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  
  // Individual target filters (consistent with AgentsPerformance)
  const [fixedFilter, setFixedFilter] = useState("all");
  const [ccFilter, setCcFilter] = useState("all");
  const [scFilter, setScFilter] = useState("all");
  const [upFilter, setUpFilter] = useState("all");
  const [targetsAchievedFilter, setTargetsAchievedFilter] = useState("all");

  const openAgentDetail = (agent: AgentData) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const closeAgentDetail = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  const toggleTeamExpansion = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const filterByStatus = (status: string) => {
    setStatusFilter(status);
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
      console.log('✅ Team Analytics - Agents data loaded:', data.length, 'agents');
    }
    loadData();
  }, []);

  // Get targets from localStorage
  const targets = useMemo(() => {
    const saved = localStorage.getItem("cmlens_targets");
    return saved ? JSON.parse(saved) : {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
    };
  }, []);

  // Get weights from localStorage
  const weights = useMemo(() => {
    const saved = localStorage.getItem("cmlens_weights");
    return saved ? JSON.parse(saved) : {
      classConsumption: 25,
      superClassConsumption: 25,
      upgradeRate: 25,
      fixedRate: 25,
    };
  }, []);

  // Calculate agent score based on targets and weights
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

  // Get agent status based on score
  const getAgentStatus = (score: number) => {
    if (score >= 100) return "Elite";
    if (score >= 80) return "Strong";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Watch";
    return "Critical";
  };

  // Function to get agent rank within their team
  const getAgentRank = (agentId: string, teamAgents: AgentData[]) => {
    const agentsWithScores = teamAgents.map(agent => ({
      ...agent,
      weightedScore: calculateScore(agent)
    }));
    
    // Sort by weighted score (descending) then assign ranks
    const sortedByScore = [...agentsWithScores].sort((a, b) => b.weightedScore - a.weightedScore);
    
    const rankIndex = sortedByScore.findIndex(a => a.id === agentId || a.name === agentId);
    return rankIndex >= 0 ? rankIndex + 1 : 0;
  };

  // Helper function to get target status (consistent with AgentsPerformance)
  const getStatus = (value: number | null, target: number) => {
    if (value === null) return "na";
    if (value >= target) return "above";
    if (value >= target * 0.9) return "warning";
    return "below";
  };

  // Function to count targets achieved by an agent (consistent with AgentsPerformance)
  const countTargetsAchieved = (agent: AgentData) => {
    let achieved = 0;
    if (getStatus(agent.fixedPct, targets.fixedRate) === "above") achieved++;
    if (getStatus(agent.ccPct, targets.classConsumption) === "above") achieved++;
    if (getStatus(agent.scPct, targets.superClassConsumption) === "above") achieved++;
    if (getStatus(agent.upPct, targets.upgradeRate) === "above") achieved++;
    return achieved;
  };

  // Helper function to check if agent matches target filters
  const matchesTargetFilters = (agent: AgentData) => {
    // Fixed Rate filter
    if (fixedFilter !== "all") {
      const fixedStatus = getStatus(agent.fixedPct, targets.fixedRate);
      if (fixedFilter !== fixedStatus) return false;
    }
    
    // Class Consumption filter
    if (ccFilter !== "all") {
      const ccStatus = getStatus(agent.ccPct, targets.classConsumption);
      if (ccFilter !== ccStatus) return false;
    }
    
    // Super Class filter
    if (scFilter !== "all") {
      const scStatus = getStatus(agent.scPct, targets.superClassConsumption);
      if (scFilter !== scStatus) return false;
    }
    
    // Upgrade Rate filter
    if (upFilter !== "all") {
      const upStatus = getStatus(agent.upPct, targets.upgradeRate);
      if (upFilter !== upStatus) return false;
    }
    
    // Targets Achieved filter
    if (targetsAchievedFilter !== "all") {
      const achieved = countTargetsAchieved(agent);
      if (targetsAchievedFilter === "0" && achieved !== 0) return false;
      if (targetsAchievedFilter === "1" && achieved !== 1) return false;
      if (targetsAchievedFilter === "2" && achieved !== 2) return false;
      if (targetsAchievedFilter === "3" && achieved !== 3) return false;
      if (targetsAchievedFilter === "4" && achieved !== 4) return false;
      if (targetsAchievedFilter === "3+" && achieved < 3) return false;
    }
    
    return true;
  };

  // Group agents by team with performance stats
  const teamStats = useMemo(() => {
    const teams: Record<string, TeamStats> = {};
    
    agentsData.forEach(agent => {
      const score = calculateScore(agent);
      const teamName = agent.team || 'Unassigned';
      
      if (!teams[teamName]) {
        teams[teamName] = {
          teamName,
          totalAgents: 0,
          averageScore: 0,
          aboveTarget: 0,
          belowTarget: 0,
          agents: []
        };
      }
      
      teams[teamName].agents.push({ ...agent });
      teams[teamName].totalAgents++;
      
      if (score >= 60) {
        teams[teamName].aboveTarget++;
      } else {
        teams[teamName].belowTarget++;
      }
    });
    
    // Calculate average scores
    Object.values(teams).forEach(team => {
      const totalScore = team.agents.reduce((sum, agent) => sum + calculateScore(agent), 0);
      team.averageScore = totalScore / team.totalAgents;
    });
    
    return Object.values(teams);
  }, [agentsData, targets]);

  // Get teams list for filter
  const teams = useMemo(() => {
    const uniqueTeams = [...new Set(agentsData.map(agent => agent.team).filter(Boolean))];
    return uniqueTeams.sort();
  }, [agentsData]);

  // Filter team stats based on selection, status, and individual target filters
  const filteredTeamStats = useMemo(() => {
    let filtered = selectedTeam === 'all' ? teamStats : teamStats.filter(team => team.teamName === selectedTeam);
    
    // Apply all filters to agents within teams and recompute team aggregates
    filtered = filtered.map(team => {
      // First, filter the agents
      const filteredAgents = team.agents.filter(agent => {
        // Status filter (existing)
        if (statusFilter !== 'all') {
          const score = calculateScore(agent);
          const status = getAgentStatus(score);
          if (status !== statusFilter) return false;
        }
        
        // Individual target filters (new)
        if (!matchesTargetFilters(agent)) return false;
        
        return true;
      });

      // If no agents match the filters, return null to be filtered out later
      if (filteredAgents.length === 0) {
        return null;
      }

      // Recompute team aggregates based on filtered agents
      let aboveTargetCount = 0;
      let belowTargetCount = 0;
      let totalScore = 0;

      filteredAgents.forEach(agent => {
        const score = calculateScore(agent);
        totalScore += score;
        
        if (score >= 60) {
          aboveTargetCount++;
        } else {
          belowTargetCount++;
        }
      });

      const averageScore = filteredAgents.length > 0 ? totalScore / filteredAgents.length : 0;

      return {
        ...team,
        agents: filteredAgents,
        totalAgents: filteredAgents.length,
        averageScore: averageScore,
        aboveTarget: aboveTargetCount,
        belowTarget: belowTargetCount
      };
    }).filter(Boolean); // Remove null entries (teams with no matching agents)
    
    return filtered as TeamStats[];
  }, [teamStats, selectedTeam, statusFilter, fixedFilter, ccFilter, scFilter, upFilter, targetsAchievedFilter, targets]);

  // Get all agents with status information for status distribution
  const agentsWithStatus = useMemo(() => {
    return agentsData.map(agent => {
      const score = calculateScore(agent);
      const status = getAgentStatus(score);
      return { ...agent, score, status };
    });
  }, [agentsData, targets]);

  // Count agents by status (only from filtered teams)
  const statusCounts = useMemo(() => {
    const counts = { Elite: 0, Strong: 0, Stable: 0, Watch: 0, Critical: 0 };
    
    // Get agents from filtered teams only
    const filteredAgents = filteredTeamStats.flatMap(team => team.agents);
    
    filteredAgents.forEach(agent => {
      const score = calculateScore(agent);
      const status = getAgentStatus(score);
      counts[status as keyof typeof counts]++;
    });
    
    return counts;
  }, [filteredTeamStats, targets]);

  // Prepare chart data for team comparison
  const chartData = useMemo(() => {
    return filteredTeamStats.map(team => ({
      name: team.teamName,
      score: Math.round(team.averageScore),
      agents: team.totalAgents,
      aboveTarget: team.aboveTarget,
      belowTarget: team.belowTarget
    }));
  }, [filteredTeamStats]);

  // Show data availability status
  const dataStatus = useMemo(() => {
    if (isLoadingData) {
      return { hasData: true, isLoading: true, message: "Loading team analytics..." };
    }
    if (agentsData.length === 0) {
      return { hasData: false, isLoading: false, message: "No performance data available. Please upload files first." };
    }
    return { hasData: true, isLoading: false, message: `Showing analytics for ${agentsData.length} agents across ${teams.length} teams.` };
  }, [agentsData, teams, isLoadingData]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Elite': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Strong': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Stable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Watch': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive team performance analysis and insights
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h3 className="text-lg font-semibold">Loading Team Analytics...</h3>
                <p className="text-muted-foreground">Fetching performance data from database</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dataStatus.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive team performance analysis and insights
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Data Available</h3>
                <p className="text-muted-foreground">{dataStatus.message}</p>
                <p className="text-sm text-muted-foreground mt-2">Go to Upload & Targets to process your performance files.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
          <p className="text-muted-foreground mt-2">
            {dataStatus.message}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Real-time Analytics</span>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
          <CardDescription>Filter and analyze team performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primary Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Performance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                  <SelectItem value="Strong">Strong</SelectItem>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Watch">Watch</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={targetsAchievedFilter} onValueChange={setTargetsAchievedFilter}>
                <SelectTrigger>
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
                  setSelectedTeam("all");
                  setStatusFilter("all");
                  setFixedFilter("all");
                  setCcFilter("all");
                  setScFilter("all");
                  setUpFilter("all");
                  setTargetsAchievedFilter("all");
                }}
              >
                Clear All
              </Button>
            </div>

            {/* Target-Specific Filters */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Individual Target Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={fixedFilter} onValueChange={setFixedFilter}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredTeamStats.map(team => (
          <Card key={team.teamName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{team.teamName}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(team.averageScore)}%</div>
              <p className="text-xs text-muted-foreground">
                Average Score
              </p>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-green-600">Above Target: {team.aboveTarget}</span>
                <span className="text-red-600">Below Target: {team.belowTarget}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Comparison</CardTitle>
          <CardDescription>
            Average team scores and agent distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8884d8" name="Average Score %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Distribution</CardTitle>
          <CardDescription>
            Breakdown of agent performance by status across selected teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-4">Performance vs Target</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Above Target', value: filteredTeamStats.reduce((sum, team) => sum + team.aboveTarget, 0) },
                      { name: 'Below Target', value: filteredTeamStats.reduce((sum, team) => sum + team.belowTarget, 0) }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Above Target', value: filteredTeamStats.reduce((sum, team) => sum + team.aboveTarget, 0) },
                      { name: 'Below Target', value: filteredTeamStats.reduce((sum, team) => sum + team.belowTarget, 0) }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#00C49F' : '#FF8042'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-4">Agent Status Distribution</h4>
              <div className="space-y-2">
                {['Elite', 'Strong', 'Stable', 'Watch', 'Critical'].map(status => {
                  const count = statusCounts[status as keyof typeof statusCounts];
                  const isActive = statusFilter === status;
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <Badge 
                        className={`${getStatusColor(status)} cursor-pointer hover:opacity-80 transition-opacity ${
                          isActive ? 'ring-2 ring-primary' : ''
                        }`} 
                        variant="secondary"
                        onClick={() => statusFilter === status ? filterByStatus('all') : filterByStatus(status)}
                        title={`Click to ${statusFilter === status ? 'clear filter' : 'filter by ' + status + ' agents'}`}
                      >
                        {status}
                      </Badge>
                      <span 
                        className="text-sm font-medium cursor-pointer hover:text-primary"
                        onClick={() => statusFilter === status ? filterByStatus('all') : filterByStatus(status)}
                      >
                        {count} agents
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Team Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
          <CardDescription>
            Detailed breakdown of agents in each team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredTeamStats.map(team => (
              <div key={team.teamName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{team.teamName}</h3>
                  <Badge variant="outline">
                    {team.totalAgents} agents
                  </Badge>
                </div>
                
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {(expandedTeams.has(team.teamName) ? team.agents : team.agents.slice(0, 6)).map(agent => {
                    const score = calculateScore(agent);
                    const status = getAgentStatus(score);
                    
                    return (
                      <div key={agent.id} className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors">
                        <div>
                          <p 
                            className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                            onClick={() => openAgentDetail(agent)}
                            title="Click to view detailed performance breakdown"
                          >
                            {agent.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">Rank #{getAgentRank(agent.id, team.agents)}</p>
                            <p className="text-xs text-muted-foreground">• {Math.round(score)}% score</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(status)} variant="secondary">
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                
                {team.agents.length > 6 && !expandedTeams.has(team.teamName) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-muted-foreground mt-2 hover:text-primary p-0 h-auto"
                    onClick={() => toggleTeamExpansion(team.teamName)}
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    And {team.agents.length - 6} more agents...
                  </Button>
                )}
                
                {expandedTeams.has(team.teamName) && team.agents.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-muted-foreground mt-2 hover:text-primary p-0 h-auto"
                    onClick={() => toggleTeamExpansion(team.teamName)}
                  >
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less...
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Detail Modal */}
      <AgentDetailModal 
        isOpen={isModalOpen}
        onClose={closeAgentDetail}
        agent={selectedAgent}
      />
    </div>
  );
};

export default TeamAnalytics;