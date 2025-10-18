import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calendar, 
  Users, 
  TrendingDown, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Sparkles,
  AlertTriangle,
  CheckCircle,
  FileText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { API_BASE_URL } from '@/services/api';

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
}

interface TeamAgent {
  id: string;
  name: string;
  team: string;
  score: number;
  category: string;
  metrics: {
    fixedPct: number;
    ccPct: number;
    scPct: number;
    upPct: number;
  };
  weaknesses: string[];
}

interface TeamData {
  week: string;
  threshold: number;
  total_agents: number;
  underperforming_count: number;
  average_score: number;
  agents: TeamAgent[];
}

interface MeetingNotes {
  content: string;
  agent_id: string;
  week: string;
  updated_at?: string;
}

// Fetch agents data from API
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

    if (Array.isArray(data)) {
      return data.map((agent: any) => ({
        id: agent.id || agent.name || 'unknown',
        name: agent.name || agent.id || 'Unknown',
        team: agent.team || '',
        group: agent.group || '',
        students: agent.students || 0,
        ccPct: agent.ccPct !== undefined ? agent.ccPct : null,
        scPct: agent.scPct !== undefined ? agent.scPct : null,
        upPct: agent.upPct !== undefined ? agent.upPct : null,
        fixedPct: agent.fixedPct !== undefined ? agent.fixedPct : null,
        referralLeads: agent.referralLeads || 0,
        referralShowups: agent.referralShowups || 0,
        referralPaid: agent.referralPaid || 0,
      })) as AgentData[];
    }

    return [];
  } catch (error) {
    console.error('Error fetching agent data:', error);
    return [];
  }
};

const Meetings: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<string>('1');
  const [threshold, setThreshold] = useState<number>(60);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});
  const [isLoadingAI, setIsLoadingAI] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // State for agents data and loading
  const [agentsData, setAgentsData] = useState<AgentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      const data = await fetchAgentsData();
      setAgentsData(data);
      setIsLoadingData(false);
      console.log('✅ Meetings - Agents data loaded:', data.length, 'agents');
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
  const calculateScore = useMemo(() => {
    return (agent: AgentData) => {
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
  }, [targets, weights]);

  // Get agent status based on score
  const getAgentStatus = (score: number) => {
    if (score >= 100) return "Elite";
    if (score >= 80) return "Strong";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Watch";
    return "Critical";
  };

  // Generate weaknesses based on metrics vs targets
  const generateWeaknesses = useMemo(() => {
    return (agent: AgentData): string[] => {
      const weaknesses = [];
      
      if (agent.fixedPct !== null && agent.fixedPct < targets.fixedRate) {
        weaknesses.push(`Fixed rate below target (${agent.fixedPct}% vs ${targets.fixedRate}%)`);
      }
      
      if (agent.ccPct !== null && agent.ccPct < targets.classConsumption) {
        weaknesses.push(`Class consumption below target (${agent.ccPct}% vs ${targets.classConsumption}%)`);
      }
      
      if (agent.scPct !== null && agent.scPct < targets.superClassConsumption) {
        weaknesses.push(`Super class below target (${agent.scPct}% vs ${targets.superClassConsumption}%)`);
      }
      
      if (agent.upPct !== null && agent.upPct < targets.upgradeRate) {
        weaknesses.push(`Upgrade rate below target (${agent.upPct}% vs ${targets.upgradeRate}%)`);
      }
      
      return weaknesses;
    };
  }, [targets]);

  // Get teams list for filter
  const teams = useMemo(() => {
    const uniqueTeams = [...new Set(agentsData.map(agent => agent.team).filter(Boolean))];
    return uniqueTeams.sort();
  }, [agentsData]);

  // Filter by status function
  const filterByStatus = (status: string) => {
    setStatusFilter(status);
  };

  // Transform AgentData to TeamAgent format with real calculation
  const processedTeamData = useMemo(() => {
    let filteredAgents = agentsData;

    // Apply team filter
    if (selectedTeam !== 'all') {
      filteredAgents = filteredAgents.filter(agent => agent.team === selectedTeam);
    }

    // Apply status filter first, then threshold
    if (statusFilter !== 'all') {
      filteredAgents = filteredAgents.filter(agent => {
        const score = calculateScore(agent);
        const status = getAgentStatus(score);
        return status === statusFilter;
      });
    }

    const underperformingAgents = filteredAgents
      .filter(agent => calculateScore(agent) < threshold)
      .map(agent => {
        const score = calculateScore(agent);
        const category = getAgentStatus(score);
        const weaknesses = generateWeaknesses(agent);

        return {
          id: agent.id,
          name: agent.name,
          team: agent.team,
          score: Math.round(score * 10) / 10, // Round to 1 decimal
          category,
          metrics: {
            fixedPct: (agent.fixedPct || 0) / 100, // Convert to decimal for display
            ccPct: (agent.ccPct || 0) / 100,
            scPct: (agent.scPct || 0) / 100,
            upPct: (agent.upPct || 0) / 100,
          },
          weaknesses
        };
      });

    const totalScore = filteredAgents.reduce((sum, agent) => sum + calculateScore(agent), 0);
    const averageScore = filteredAgents.length > 0 ? totalScore / filteredAgents.length : 0;

    return {
      week: selectedWeek,
      threshold,
      total_agents: filteredAgents.length,
      underperforming_count: underperformingAgents.length,
      average_score: Math.round(averageScore * 10) / 10,
      agents: underperformingAgents
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentsData, threshold, selectedWeek, statusFilter, selectedTeam]);

  // Available weeks for selection
  const weeks = [
    { value: '1', label: 'Week 1 (Current)' },
    { value: '2', label: 'Week 2' },
    { value: '3', label: 'Week 3' },
    { value: '4', label: 'Week 4' }
  ];

  // Load meeting notes for specific agent (localStorage based)
  const loadMeetingNotes = async (agentId: string): Promise<string> => {
    try {
      // For now, return empty string - could implement localStorage-based notes storage
      return localStorage.getItem(`meeting_notes_${agentId}_${selectedWeek}`) || '';
    } catch (error) {
      console.error('Error loading meeting notes:', error);
      return '';
    }
  };

  // Save meeting notes (localStorage based)
  const saveMeetingNotes = async (agentId: string, content: string) => {
    try {
      localStorage.setItem(`meeting_notes_${agentId}_${selectedWeek}`, content);
      setMeetingNotes(prev => ({ ...prev, [agentId]: content }));
      toast({
        title: "Success",
        description: "Meeting notes saved successfully"
      });
    } catch (error) {
      console.error('Error saving meeting notes:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting notes",
        variant: "destructive"
      });
    }
  };

  // Generate AI meeting insights using the real backend API
  const generateMeetingInsights = async (agent: TeamAgent) => {
    setIsLoadingAI(agent.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'meeting',
          agent_data: agent
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMeetingNotes(prev => ({
          ...prev,
          [agent.id]: result.analysis
        }));
        
        // Also save to localStorage
        localStorage.setItem(`meeting_notes_${agent.id}_${selectedWeek}`, result.analysis);
        
        toast({
          title: "AI Insights Generated",
          description: "Meeting preparation notes are ready",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate insights",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      toast({
        title: "Error", 
        description: "Failed to generate insights",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAI('');
    }
  };

  // Load all meeting notes when agents list or week changes
  useEffect(() => {
    const loadNotes = async () => {
      const agentIds = processedTeamData.agents.map(a => a.id);
      const notesPromises = agentIds.map(async (id) => {
        const notes = await loadMeetingNotes(id);
        return { id, notes };
      });

      const allNotes = await Promise.all(notesPromises);
      const notesMap: Record<string, string> = {};
      allNotes.forEach(({ id, notes }) => {
        if (notes) notesMap[id] = notes;
      });

      setMeetingNotes(prev => ({ ...prev, ...notesMap }));
    };

    if (processedTeamData.agents.length > 0) {
      loadNotes();
    }
  }, [selectedWeek, agentsData.length, threshold, selectedTeam, statusFilter]);

  const toggleAgentExpansion = (agentId: string) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Elite': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Strong': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Stable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Watch': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    return getCategoryColor(status);
  };

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Meetings</h1>
            <p className="text-muted-foreground mt-2">
              Threshold-based team performance analysis for meeting preparation
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-lg font-semibold">Loading Meeting Data...</h3>
              <p className="text-muted-foreground">Fetching performance data from database</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show data availability status
  const dataStatus = useMemo(() => {
    if (agentsData.length === 0) {
      return { hasData: false, message: "No performance data available. Please upload files first." };
    }
    return { hasData: true, message: `Analyzing ${agentsData.length} agents with ${threshold}% threshold.` };
  }, [agentsData, threshold]);

  if (!dataStatus.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Meetings</h1>
            <p className="text-muted-foreground mt-2">
              Threshold-based team performance analysis for meeting preparation
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Meetings</h1>
          <p className="text-muted-foreground mt-2">
            {dataStatus.message}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Meeting Prep</span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Week Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map(week => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={filterByStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="Watch">Watch</SelectItem>
                <SelectItem value="Stable">Stable</SelectItem>
                <SelectItem value="Strong">Strong</SelectItem>
                <SelectItem value="Elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minimum Score</span>
                <span className="font-medium">{threshold}%</span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={([value]) => setThreshold(value)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Showing agents below {threshold}% performance
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedTeamData.total_agents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Underperforming</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {processedTeamData.underperforming_count}
            </div>
            <p className="text-xs text-muted-foreground">
              Below {threshold}% threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedTeamData.average_score}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Focus</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Math.round((processedTeamData.underperforming_count / processedTeamData.total_agents) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Underperforming Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Agents Needing Attention (Below {threshold}%)</CardTitle>
          <CardDescription>
            Focus agents for this week's meeting based on performance threshold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedTeamData.agents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700">All Agents Above Threshold!</h3>
              <p className="text-muted-foreground">No agents need immediate attention this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {processedTeamData.agents.map(agent => (
                <Collapsible
                  key={agent.id}
                  open={expandedAgents.has(agent.id)}
                  onOpenChange={() => toggleAgentExpansion(agent.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {expandedAgents.has(agent.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <Badge className={getCategoryColor(agent.category)} variant="secondary">
                          {agent.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{agent.team}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold text-orange-600">{agent.score}%</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateMeetingInsights(agent);
                          }}
                          disabled={isLoadingAI === agent.id}
                        >
                          {isLoadingAI === agent.id ? (
                            "Generating..."
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Insights
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Performance Metrics */}
                        <div>
                          <h4 className="font-medium mb-2">Performance Metrics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Fixed Rate:</span>
                              <span className={agent.metrics.fixedPct < targets.fixedRate / 100 ? 'text-red-600' : 'text-green-600'}>
                                {Math.round(agent.metrics.fixedPct * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Class Consumption:</span>
                              <span className={agent.metrics.ccPct < targets.classConsumption / 100 ? 'text-red-600' : 'text-green-600'}>
                                {Math.round(agent.metrics.ccPct * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Super Class:</span>
                              <span className={agent.metrics.scPct < targets.superClassConsumption / 100 ? 'text-red-600' : 'text-green-600'}>
                                {Math.round(agent.metrics.scPct * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Upgrade Rate:</span>
                              <span className={agent.metrics.upPct < targets.upgradeRate / 100 ? 'text-red-600' : 'text-green-600'}>
                                {Math.round(agent.metrics.upPct * 100)}%
                              </span>
                            </div>
                          </div>

                          {agent.weaknesses.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium mb-2 text-red-600">Areas of Concern</h4>
                              <ul className="text-sm space-y-1">
                                {agent.weaknesses.map((weakness, index) => (
                                  <li key={index} className="flex items-start">
                                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Meeting Notes */}
                        <div>
                          <h4 className="font-medium mb-2">Meeting Notes</h4>
                          <Textarea
                            placeholder="Add meeting discussion points, action items, or follow-up notes..."
                            value={meetingNotes[agent.id] || ''}
                            onChange={(e) => setMeetingNotes(prev => ({ ...prev, [agent.id]: e.target.value }))}
                            className="min-h-[120px]"
                          />
                          <Button
                            onClick={() => saveMeetingNotes(agent.id, meetingNotes[agent.id] || '')}
                            size="sm"
                            className="mt-2"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Meetings;