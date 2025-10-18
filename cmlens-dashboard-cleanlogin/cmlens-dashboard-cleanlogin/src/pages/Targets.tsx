import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Target, TrendingUp, Users, Phone, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { API_BASE_URL } from '@/services/api';

interface AgentMetrics {
  fixedPct: number;
  ccPct: number;
  scPct: number;
  upPct: number;
  students: number;
  referralLeads: number;
  referralShowups: number;
  referralPaid: number;
}

interface Agent {
  id: string;
  name: string;
  team: string;
  group: string;
  score: number;
  category: string;
  metrics: AgentMetrics;
}

interface CoachingNotes {
  content: string;
  agent_id: string;
  type: string;
  updated_at?: string;
}

const Targets: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentData, setAgentData] = useState<Agent | null>(null);
  const [coachingNotes, setCoachingNotes] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSource, setAiSource] = useState<'ai' | 'fallback'>('ai');

  // Teams and agents data from backend
  const [teams, setTeams] = useState<string[]>([]);
  const [agentsByTeam, setAgentsByTeam] = useState<Record<string, Array<{id: string, name: string}>>>({});

  // Load agent performance data
  const loadAgentData = async (agentId: string) => {
    setIsLoadingAgent(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent-performance/${agentId}`);
      const result = await response.json();
      
      if (result.success) {
        setAgentData(result.agent);
      } else {
        toast({
          title: "Error",
          description: "Failed to load agent data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
      toast({
        title: "Error",
        description: "Failed to load agent data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // Load coaching notes
  const loadCoachingNotes = async (agentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/coaching-notes/${agentId}`);
      const notes: CoachingNotes = await response.json();
      setCoachingNotes(notes.content || '');
    } catch (error) {
      console.error('Error loading coaching notes:', error);
    }
  };

  // Save coaching notes
  const saveCoachingNotes = async () => {
    if (!selectedAgent) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/coaching-notes/${selectedAgent}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: coachingNotes })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Coaching notes saved successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save coaching notes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving coaching notes:', error);
      toast({
        title: "Error",
        description: "Failed to save coaching notes",
        variant: "destructive"
      });
    }
  };

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    if (!agentData) return;

    setIsLoadingAI(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'coaching',
          agent_data: agentData
        })
      });

      const result = await response.json();
      if (result.success) {
        setAiAnalysis(result.analysis);
        setAiSource(result.source || 'ai');
        if (result.source === 'fallback') {
          toast({
            title: "Analysis Generated",
            description: result.message || "Using rule-based analysis",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to generate analysis",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate analysis",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Load teams and agents data
  const loadTeamsAndAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams-agents`);
      const result = await response.json();
      
      if (result.success) {
        setTeams(result.data.teams);
        setAgentsByTeam(result.data.agents_by_team);
      } else {
        toast({
          title: "Error",
          description: "Failed to load teams and agents",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading teams and agents:', error);
      toast({
        title: "Error", 
        description: "Failed to load teams and agents",
        variant: "destructive"
      });
    }
  };

  // Load teams and agents on component mount
  useEffect(() => {
    loadTeamsAndAgents();
  }, []);

  // Handle agent selection
  useEffect(() => {
    if (selectedAgent) {
      loadAgentData(selectedAgent);
      loadCoachingNotes(selectedAgent);
      setAiAnalysis(''); // Clear previous analysis
    }
  }, [selectedAgent]);

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Elite': return 'bg-green-500';
      case 'Strong': return 'bg-blue-500';
      case 'Stable': return 'bg-yellow-500';
      case 'Watch': return 'bg-orange-500';
      case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get metric color
  const getMetricColor = (value: number, target: number) => {
    if (value >= target) return 'text-green-600';
    if (value >= target * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const chartData = agentData ? [
    { name: 'Fixed%', value: agentData.metrics.fixedPct * 100, target: 70 },
    { name: 'CC%', value: agentData.metrics.ccPct * 100, target: 60 },
    { name: 'SC%', value: agentData.metrics.scPct * 100, target: 30 },
    { name: 'UP%', value: agentData.metrics.upPct * 100, target: 15 }
  ] : [];

  const pieData = agentData ? [
    { name: 'Fixed%', value: agentData.metrics.fixedPct * 30, fill: '#8884d8' },
    { name: 'CC%', value: agentData.metrics.ccPct * 25, fill: '#82ca9d' },
    { name: 'SC%', value: agentData.metrics.scPct * 25, fill: '#ffc658' },
    { name: 'UP%', value: agentData.metrics.upPct * 20, fill: '#ff7300' }
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Target className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Individual Agent Coaching</h1>
      </div>

      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Selection</CardTitle>
          <CardDescription>Select team and agent for detailed coaching analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={selectedTeam} onValueChange={(value) => {
                setSelectedTeam(value);
                setSelectedAgent('');
                setAgentData(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <Select 
                value={selectedAgent} 
                onValueChange={setSelectedAgent}
                disabled={!selectedTeam}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTeam && agentsByTeam[selectedTeam]?.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Dashboard */}
      {agentData && (
        <>
          {/* Overall Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Performance Dashboard
                <Badge className={getCategoryColor(agentData.category)}>
                  {agentData.category}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{agentData.score}%</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold flex items-center justify-center">
                    <Users className="h-5 w-5 mr-1" />
                    {agentData.metrics.students}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold flex items-center justify-center">
                    <Phone className="h-5 w-5 mr-1" />
                    {agentData.metrics.referralLeads}
                  </div>
                  <div className="text-sm text-gray-600">Referral Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    {agentData.metrics.referralPaid}
                  </div>
                  <div className="text-sm text-gray-600">Referral Paid</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Fixed%</CardTitle>
                <CardDescription>Student Retention Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getMetricColor(agentData.metrics.fixedPct * 100, 70)}`}>
                  {(agentData.metrics.fixedPct * 100).toFixed(1)}%
                </div>
                <Progress value={agentData.metrics.fixedPct * 100} className="mt-2" />
                <div className="text-sm text-gray-600 mt-1">Target: 70%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">CC%</CardTitle>
                <CardDescription>Class Coverage Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getMetricColor(agentData.metrics.ccPct * 100, 60)}`}>
                  {(agentData.metrics.ccPct * 100).toFixed(1)}%
                </div>
                <Progress value={agentData.metrics.ccPct * 100} className="mt-2" />
                <div className="text-sm text-gray-600 mt-1">Target: 60%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">SC%</CardTitle>
                <CardDescription>Success Calls Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getMetricColor(agentData.metrics.scPct * 100, 30)}`}>
                  {(agentData.metrics.scPct * 100).toFixed(1)}%
                </div>
                <Progress value={agentData.metrics.scPct * 100} className="mt-2" />
                <div className="text-sm text-gray-600 mt-1">Target: 30%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">UP%</CardTitle>
                <CardDescription>Upselling Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getMetricColor(agentData.metrics.upPct * 100, 15)}`}>
                  {(agentData.metrics.upPct * 100).toFixed(1)}%
                </div>
                <Progress value={agentData.metrics.upPct * 100} className="mt-2" />
                <div className="text-sm text-gray-600 mt-1">Target: 15%</div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>Weighted contribution to overall score</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Metrics vs Targets */}
            <Card>
              <CardHeader>
                <CardTitle>Metrics vs Targets</CardTitle>
                <CardDescription>Performance against target benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Actual" />
                    <Bar dataKey="target" fill="#82ca9d" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Smart Coaching Recommendations
                </div>
                <Button 
                  onClick={generateAIAnalysis} 
                  disabled={isLoadingAI}
                  size="sm"
                >
                  {isLoadingAI ? 'Analyzing...' : 'Generate AI Insights'}
                </Button>
              </CardTitle>
              <CardDescription>
                AI-powered coaching insights and action plans
                {aiSource === 'fallback' && (
                  <Badge variant="outline" className="ml-2">Rule-based</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiAnalysis ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{aiAnalysis}</pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Generate AI Insights" to get personalized coaching recommendations
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coaching Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Notes</CardTitle>
              <CardDescription>Persistent coaching observations and action plans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add coaching notes, observations, action plans, and follow-up tasks..."
                value={coachingNotes}
                onChange={(e) => setCoachingNotes(e.target.value)}
                rows={6}
              />
              <Button onClick={saveCoachingNotes}>Save Notes</Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedAgent && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select an Agent to Begin Coaching</h3>
              <p>Choose a team and agent above to view detailed performance analysis and coaching tools.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Targets;