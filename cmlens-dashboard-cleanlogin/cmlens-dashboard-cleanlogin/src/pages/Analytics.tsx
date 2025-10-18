import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Award, AlertTriangle, BarChart3 } from 'lucide-react';
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

const Analytics: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('fixed');
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAgentDetail = (agent: AgentData) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const closeAgentDetail = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  // API base URL
  const API_BASE_URL = import.meta.env.PROD
    ? 'https://cmlens-dashboard-production.up.railway.app'
    : 'http://localhost:8080';

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
          referralAchPct: agent.referralAchPct !== undefined ? agent.referralAchPct : null,
          conversionRate: agent.conversionRate !== undefined ? agent.conversionRate : null,
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
      console.log('✅ Analytics - Agents data loaded:', data.length, 'agents');
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

  // Get unique teams
  const teams = useMemo(() => {
    const uniqueTeams = [...new Set(agentsData.map(agent => agent.team).filter(Boolean))];
    return uniqueTeams.sort();
  }, [agentsData]);

  // Filter agents by team
  const filteredAgents = useMemo(() => {
    return selectedTeam === 'all' 
      ? agentsData 
      : agentsData.filter(agent => agent.team === selectedTeam);
  }, [agentsData, selectedTeam]);

  // Helper function to get status vs target
  const getStatus = (value: number | null, target: number) => {
    if (value === null) return "na";
    if (value >= target) return "above";
    if (value >= target * 0.9) return "warning";
    return "below";
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "above": return "text-green-600 bg-green-100";
      case "warning": return "text-yellow-600 bg-yellow-100";
      case "below": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "above": return <TrendingUp className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "below": return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  // Generate metric-specific analytics
  const generateMetricAnalytics = (metricKey: keyof AgentData, metricName: string, target: number, unit: string = '%') => {
    const validAgents = filteredAgents.filter(agent => agent[metricKey] !== null);
    const values = validAgents.map(agent => agent[metricKey] as number);
    
    if (values.length === 0) {
      return {
        summary: {
          total: 0,
          average: 0,
          aboveTarget: 0,
          nearTarget: 0,
          belowTarget: 0,
          noData: filteredAgents.length
        },
        distribution: [],
        topPerformers: [],
        bottomPerformers: [],
        teamComparison: []
      };
    }

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const aboveTarget = values.filter(v => v >= target).length;
    const nearTarget = values.filter(v => v >= target * 0.9 && v < target).length;
    const belowTarget = values.filter(v => v < target * 0.9).length;
    const noData = filteredAgents.length - validAgents.length;

    // Distribution data for charts
    const distributionRanges = [
      { range: `0-${Math.floor(target * 0.5)}${unit}`, count: 0, color: '#ef4444' },
      { range: `${Math.floor(target * 0.5)}-${Math.floor(target * 0.9)}${unit}`, count: 0, color: '#f97316' },
      { range: `${Math.floor(target * 0.9)}-${target}${unit}`, count: 0, color: '#eab308' },
      { range: `${target}${unit}+`, count: 0, color: '#22c55e' }
    ];

    values.forEach(value => {
      if (value < target * 0.5) distributionRanges[0].count++;
      else if (value < target * 0.9) distributionRanges[1].count++;
      else if (value < target) distributionRanges[2].count++;
      else distributionRanges[3].count++;
    });

    // Top and bottom performers
    const agentsWithValues = validAgents
      .map(agent => ({
        ...agent,
        value: agent[metricKey] as number,
        status: getStatus(agent[metricKey] as number, target)
      }))
      .sort((a, b) => b.value - a.value);

    const topPerformers = agentsWithValues.slice(0, 5);
    const bottomPerformers = agentsWithValues.slice(-5).reverse();

    // Team comparison (if multiple teams)
    const teamComparison = teams.map(team => {
      const teamAgents = validAgents.filter(agent => agent.team === team);
      const teamValues = teamAgents.map(agent => agent[metricKey] as number);
      const teamAverage = teamValues.length > 0 ? teamValues.reduce((a, b) => a + b, 0) / teamValues.length : 0;
      const teamAboveTarget = teamValues.filter(v => v >= target).length;
      
      return {
        team,
        average: teamAverage,
        aboveTarget: teamAboveTarget,
        total: teamAgents.length,
        aboveTargetPct: teamAgents.length > 0 ? (teamAboveTarget / teamAgents.length) * 100 : 0
      };
    }).filter(team => team.total > 0).sort((a, b) => b.average - a.average);

    return {
      summary: {
        total: validAgents.length,
        average,
        aboveTarget,
        nearTarget,
        belowTarget,
        noData
      },
      distribution: distributionRanges,
      topPerformers,
      bottomPerformers,
      teamComparison
    };
  };

  // Generate analytics for each metric
  const fixedAnalytics = generateMetricAnalytics('fixedPct', 'Fixed Rate', targets.fixedRate);
  const ccAnalytics = generateMetricAnalytics('ccPct', 'Class Consumption', targets.classConsumption);
  const scAnalytics = generateMetricAnalytics('scPct', 'Super Class', targets.superClassConsumption);
  const upAnalytics = generateMetricAnalytics('upPct', 'Upgrade Rate', targets.upgradeRate);

  // Render metric tab content
  const renderMetricTab = (analytics: any, metricName: string, target: number, unit: string = '%') => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.total}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.noData > 0 && `${analytics.summary.noData} missing data`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average {metricName}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.average.toFixed(1)}{unit}</div>
            <p className="text-xs text-muted-foreground">
              Target: {target}{unit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Above Target</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.summary.aboveTarget}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.total > 0 ? Math.round((analytics.summary.aboveTarget / analytics.summary.total) * 100) : 0}% of agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Below Target</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.summary.belowTarget}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.total > 0 ? Math.round((analytics.summary.belowTarget / analytics.summary.total) * 100) : 0}% of agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{metricName} Distribution</CardTitle>
          <CardDescription>Performance distribution across different ranges</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Status</CardTitle>
          <CardDescription>Breakdown by target achievement status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Above Target', value: analytics.summary.aboveTarget, color: '#22c55e' },
                    { name: 'Near Target', value: analytics.summary.nearTarget, color: '#eab308' },
                    { name: 'Below Target', value: analytics.summary.belowTarget, color: '#ef4444' },
                    { name: 'No Data', value: analytics.summary.noData, color: '#6b7280' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {[
                    { name: 'Above Target', value: analytics.summary.aboveTarget, color: '#22c55e' },
                    { name: 'Near Target', value: analytics.summary.nearTarget, color: '#eab308' },
                    { name: 'Below Target', value: analytics.summary.belowTarget, color: '#ef4444' },
                    { name: 'No Data', value: analytics.summary.noData, color: '#6b7280' }
                  ].map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  Above Target
                </span>
                <span className="font-medium">{analytics.summary.aboveTarget}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  Near Target
                </span>
                <span className="font-medium">{analytics.summary.nearTarget}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  Below Target
                </span>
                <span className="font-medium">{analytics.summary.belowTarget}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  No Data
                </span>
                <span className="font-medium">{analytics.summary.noData}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Highest {metricName.toLowerCase()} achievers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topPerformers.map((agent: any, index: number) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => openAgentDetail(agent)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{agent.value.toFixed(1)}{unit}</p>
                    <Badge className={getStatusColor(agent.status)}>
                      {getStatusIcon(agent.status)}
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bottom Performers</CardTitle>
            <CardDescription>Agents needing improvement in {metricName.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.bottomPerformers.map((agent: any, index: number) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => openAgentDetail(agent)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {analytics.topPerformers.length - index}
                    </Badge>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{agent.value.toFixed(1)}{unit}</p>
                    <Badge className={getStatusColor(agent.status)}>
                      {getStatusIcon(agent.status)}
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Comparison */}
      {analytics.teamComparison.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Comparison</CardTitle>
            <CardDescription>{metricName} performance by team</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.teamComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#8884d8" name={`Average ${metricName}`} />
                <Bar dataKey="aboveTargetPct" fill="#82ca9d" name="% Above Target" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-lg font-semibold">Loading Target Analytics...</h3>
              <p className="text-muted-foreground">Fetching performance data from database</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Target Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive performance analysis for each target metric
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Metric Analysis</span>
        </div>
      </div>

      {/* Team Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
          <CardDescription>Filter analytics by team or view all teams</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team} value={team}>{team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Metric Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fixed">Fixed Rate</TabsTrigger>
          <TabsTrigger value="cc">Class Consumption</TabsTrigger>
          <TabsTrigger value="sc">Super Class</TabsTrigger>
          <TabsTrigger value="up">Upgrade Rate</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="space-y-4">
          {renderMetricTab(fixedAnalytics, "Fixed Rate", targets.fixedRate)}
        </TabsContent>

        <TabsContent value="cc" className="space-y-4">
          {renderMetricTab(ccAnalytics, "Class Consumption", targets.classConsumption)}
        </TabsContent>

        <TabsContent value="sc" className="space-y-4">
          {renderMetricTab(scAnalytics, "Super Class", targets.superClassConsumption)}
        </TabsContent>

        <TabsContent value="up" className="space-y-4">
          {renderMetricTab(upAnalytics, "Upgrade Rate", targets.upgradeRate)}
        </TabsContent>
      </Tabs>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          isOpen={isModalOpen}
          onClose={closeAgentDetail}
        />
      )}
    </div>
  );
};

export default Analytics;