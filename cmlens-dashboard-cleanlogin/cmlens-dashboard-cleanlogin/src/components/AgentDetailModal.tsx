import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Target, Users, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnrecoveredStudentsModal from "./UnrecoveredStudentsModal";

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

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData | null;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ isOpen, onClose, agent }) => {
  const [isUnrecoveredModalOpen, setIsUnrecoveredModalOpen] = useState(false);
  
  // Get targets from localStorage - MUST be before any early returns
  const targets = React.useMemo(() => {
    const saved = localStorage.getItem("cmlens_targets");
    return saved ? JSON.parse(saved) : {
      classConsumption: 80,
      superClassConsumption: 15,
      upgradeRate: 25,
      fixedRate: 60,
      referralAchievement: 80,
      conversionRate: 30,
    };
  }, []);
  
  console.log('AgentDetailModal rendered:', { 
    isOpen, 
    agentId: agent?.id, 
    agentData: agent ? {
      referralAchPct: agent.referralAchPct,
      conversionRate: agent.conversionRate,
      totalLeads: agent.totalLeads,
      recoveredLeads: agent.recoveredLeads,
      hasAllFields: !!(agent.id && agent.name && agent.team !== undefined && agent.group !== undefined)
    } : null
  });
  
  if (!agent) {
    console.log('No agent provided to modal');
    return null;
  }

  // Ensure all required fields exist
  const safeAgent = {
    ...agent,
    referralAchPct: agent.referralAchPct ?? null,
    conversionRate: agent.conversionRate ?? null,
    totalLeads: agent.totalLeads ?? 0,
    recoveredLeads: agent.recoveredLeads ?? 0,
    unrecoveredLeads: agent.unrecoveredLeads ?? 0,
    unrecoveredStudents: agent.unrecoveredStudents ?? []
  };

  console.log('Safe agent data:', safeAgent);

  // Helper function to get status vs target
  const getStatus = (value: number | null, target: number) => {
    if (value === null) return "na";
    if (value >= target) return "above";
    if (value >= target * 0.9) return "warning";
    return "below";
  };

  // Function to count targets achieved
  const countTargetsAchieved = (agentData: AgentData) => {
    let achieved = 0;
    if (getStatus(agentData.fixedPct, targets.fixedRate) === "above") achieved++;
    if (getStatus(agentData.ccPct, targets.classConsumption) === "above") achieved++;
    if (getStatus(agentData.scPct, targets.superClassConsumption) === "above") achieved++;
    if (getStatus(agentData.upPct, targets.upgradeRate) === "above") achieved++;
    // Note: Referral % and Conversion Rate don't have targets, so they're not included
    return achieved;
  };

  // Calculate overall score (weighted average)
  const calculateOverallScore = (agentData: AgentData) => {
    const scores = [];
    if (agentData.fixedPct !== null) scores.push((agentData.fixedPct / targets.fixedRate) * 100);
    if (agentData.ccPct !== null) scores.push((agentData.ccPct / targets.classConsumption) * 100);
    if (agentData.scPct !== null) scores.push((agentData.scPct / targets.superClassConsumption) * 100);
    if (agentData.upPct !== null) scores.push((agentData.upPct / targets.upgradeRate) * 100);
    if (agentData.referralAchPct !== null) scores.push((agentData.referralAchPct / targets.referralAchievement) * 100);
    if (agentData.conversionRate !== null) scores.push((agentData.conversionRate / targets.conversionRate) * 100);
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  const formatPercent = (value: number | null) => {
    return value !== null ? `${value.toFixed(1)}%` : "N/A";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "above": return "text-green-600 bg-green-100";
      case "warning": return "text-yellow-600 bg-yellow-100";
      case "below": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "above": return <CheckCircle className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "below": return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const metrics = [
    {
      label: "Fixed Rate",
      value: safeAgent.fixedPct,
      target: targets.fixedRate,
      icon: <Target className="h-4 w-4" />
    },
    {
      label: "Class Consumption",
      value: safeAgent.ccPct,
      target: targets.classConsumption,
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      label: "Super Class",
      value: safeAgent.scPct,
      target: targets.superClassConsumption,
      icon: <Users className="h-4 w-4" />
    },
    {
      label: "Upgrade Rate",
      value: safeAgent.upPct,
      target: targets.upgradeRate,
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      label: "Referral Achievement",
      value: safeAgent.referralAchPct,
      target: null, // No target for referral achievement
      icon: <ExternalLink className="h-4 w-4" />
    },
    {
      label: "Conversion Rate",
      value: safeAgent.conversionRate,
      target: null, // No target for conversion rate
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const targetsAchieved = countTargetsAchieved(safeAgent);
  const overallScore = calculateOverallScore(safeAgent);

  const openTrainingRecord = () => {
    window.open(`https://cm-dashboard.replit.app/?agent=${encodeURIComponent(safeAgent.id)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{safeAgent.id}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                {targetsAchieved}/4 Targets Achieved
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={openTrainingRecord}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Training Record
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {safeAgent.team} • {safeAgent.group} • {safeAgent.students} Students
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Performance Summary */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {overallScore.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {targetsAchieved}
                  </div>
                  <div className="text-sm text-muted-foreground">Targets Achieved</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {agent.students}
                  </div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics Breakdown */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Target Achievement Breakdown</CardTitle>
              <CardDescription>
                Detailed analysis of performance vs targets with explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => {
                  const hasTarget = metric.target !== null;
                  const status = hasTarget ? getStatus(metric.value, metric.target) : null;
                  const progress = hasTarget && metric.value !== null ? Math.min((metric.value / metric.target) * 100, 100) : 0;
                  
                  return (
                    <div key={metric.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {metric.icon}
                          <span className="font-medium">{metric.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasTarget && (
                            <Badge className={`${getStatusColor(status)} border-0`}>
                              {getStatusIcon(status)}
                              {status === "above" ? "Above Target" : 
                               status === "warning" ? "Near Target" : 
                               status === "below" ? "Below Target" : "No Data"}
                            </Badge>
                          )}
                          <span className="font-bold">
                            {formatPercent(metric.value)}{hasTarget ? ` / ${metric.target}%` : ''}
                          </span>
                        </div>
                      </div>
                      {hasTarget && <Progress value={progress} className="h-2" />}
                      {hasTarget && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Current: {formatPercent(metric.value)}</span>
                          <span>Target: {metric.target}%</span>
                        </div>
                      )}
                      {!hasTarget && <div className="h-4"></div>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Leads Conversion */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Leads Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {safeAgent.totalLeads || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Leads</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">
                    {safeAgent.recoveredLeads || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Recovered</div>
                </div>
                <div>
                  <button 
                    onClick={() => setIsUnrecoveredModalOpen(true)}
                    className="text-2xl font-bold text-destructive hover:text-destructive/80 transition-colors cursor-pointer hover:underline"
                    disabled={!safeAgent.unrecoveredLeads || safeAgent.unrecoveredLeads === 0}
                    title={safeAgent.unrecoveredLeads > 0 ? "Click to view unrecovered student details" : "No unrecovered students"}
                  >
                    {safeAgent.unrecoveredLeads || 0}
                  </button>
                  <div className="text-sm text-muted-foreground">
                    Unrecovered
                    {safeAgent.unrecoveredLeads > 0 && (
                      <div className="text-xs text-destructive/70 mt-1">Click to view details</div>
                    )}
                  </div>
                </div>
              </div>
              
              {safeAgent.totalLeads > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Recovery Rate:</span>
                      <span className="font-medium ml-2 text-success">
                        {((safeAgent.recoveredLeads / safeAgent.totalLeads) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unrecovered Rate:</span>
                      <span className="font-medium ml-2 text-destructive">
                        {((safeAgent.unrecoveredLeads / safeAgent.totalLeads) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Referral Performance */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Referral Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {safeAgent.referralLeads}
                  </div>
                  <div className="text-sm text-muted-foreground">Leads Generated</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {safeAgent.referralShowups}
                  </div>
                  <div className="text-sm text-muted-foreground">Showups</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {safeAgent.referralPaid}
                  </div>
                  <div className="text-sm text-muted-foreground">Paid Conversions</div>
                </div>
              </div>
              
              {safeAgent.referralLeads > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Showup Rate:</span>
                      <span className="font-medium ml-2">
                        {((safeAgent.referralShowups / safeAgent.referralLeads) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conversion Rate:</span>
                      <span className="font-medium ml-2">
                        {safeAgent.referralShowups > 0 
                          ? ((safeAgent.referralPaid / safeAgent.referralShowups) * 100).toFixed(1)
                          : '0.0'}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ranking Explanation */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Ranking Explanation</CardTitle>
              <CardDescription>
                Why this agent has this ranking and what needs improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Rank by Targets: {targetsAchieved}/4</Badge>
                  <Badge variant="outline">Overall Score: {overallScore.toFixed(1)}%</Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Strengths:</h4>
                  <ul className="space-y-1 text-sm">
                    {metrics.filter(m => m.target !== null && getStatus(m.value, m.target) === "above").map(m => (
                      <li key={m.label} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {m.label}: {formatPercent(m.value)} (Target: {m.target}%)
                      </li>
                    ))}
                    {metrics.filter(m => m.target !== null && getStatus(m.value, m.target) === "above").length === 0 && (
                      <li className="text-muted-foreground">No targets currently exceeded</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Areas for Improvement:</h4>
                  <ul className="space-y-1 text-sm">
                    {metrics.filter(m => m.target !== null && getStatus(m.value, m.target) === "below").map(m => (
                      <li key={m.label} className="flex items-center gap-2">
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        {m.label}: {formatPercent(m.value)} (Need: {m.target}% - Gap: {m.value !== null ? (m.target - m.value).toFixed(1) : m.target}%)
                      </li>
                    ))}
                    {metrics.filter(m => m.target !== null && getStatus(m.value, m.target) === "below").length === 0 && (
                      <li className="text-muted-foreground">All available targets are being met!</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      
      {/* Unrecovered Students Modal */}
      <UnrecoveredStudentsModal
        isOpen={isUnrecoveredModalOpen}
        onClose={() => setIsUnrecoveredModalOpen(false)}
        agentName={safeAgent.name}
        unrecoveredStudents={safeAgent.unrecoveredStudents || []}
      />
    </Dialog>
  );
};

export default AgentDetailModal;