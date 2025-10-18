import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  TrendingUp,
  MessageSquare,
  Activity,
  FileText,
  Target
} from "lucide-react";
import { AgentCallMetrics } from "@/types/callData";

interface AgentCallCardProps {
  metrics: AgentCallMetrics;
  onClick?: () => void;
}

const AgentCallCard: React.FC<AgentCallCardProps> = ({ metrics, onClick }) => {
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.85) return 'text-green-600';
    if (score >= 0.70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Determine dominant risk level
  const dominantRiskLevel = Object.entries(metrics.risk_level_breakdown)
    .reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0];

  // Calculate total violations across all policies
  const totalPolicyViolations = Object.values(metrics.policy_violations).reduce((a, b) => a + b, 0);

  return (
    <Card
      className="glass-card hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-foreground">
              {metrics.agent_id}
            </CardTitle>
            <CardDescription className="mt-1">
              {metrics.total_calls} Calls Analyzed
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`px-3 py-1 ${getRiskColor(dominantRiskLevel)}`}
          >
            {dominantRiskLevel.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Compliance Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Compliance</span>
            </div>
            <div className={`text-2xl font-bold ${getComplianceColor(metrics.avg_compliance_score)}`}>
              {metrics.avg_compliance_score.toFixed(0)}%
            </div>
            <Progress value={metrics.avg_compliance_score} className="h-2" />
          </div>

          {/* Quality Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Quality</span>
            </div>
            <div className={`text-2xl font-bold ${getQualityColor(metrics.avg_text_quality_score)}`}>
              {formatPercentage(metrics.avg_text_quality_score)}
            </div>
            <Progress value={metrics.avg_text_quality_score * 100} className="h-2" />
          </div>
        </div>

        {/* Violations & Call Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {metrics.total_violations > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div className={`text-lg font-bold ${metrics.total_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.total_violations}
            </div>
            <div className="text-xs text-muted-foreground">Violations</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatDuration(Math.round(metrics.avg_call_duration))}
            </div>
            <div className="text-xs text-muted-foreground">Avg Duration</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MessageSquare className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {metrics.avg_agent_turns.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Turns</div>
          </div>
        </div>

        {/* Risk & Complexity Distribution */}
        <div className="space-y-3 pt-4 border-t">
          <div className="text-sm font-medium text-muted-foreground">Risk Distribution</div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex-1 justify-center bg-green-50 text-green-700 border-green-200">
              Low: {metrics.risk_level_breakdown.low}
            </Badge>
            <Badge variant="outline" className="flex-1 justify-center bg-yellow-50 text-yellow-700 border-yellow-200">
              Med: {metrics.risk_level_breakdown.medium}
            </Badge>
            <Badge variant="outline" className="flex-1 justify-center bg-red-50 text-red-700 border-red-200">
              High: {metrics.risk_level_breakdown.high}
            </Badge>
          </div>
        </div>

        {/* Top Intents */}
        {metrics.top_intents && metrics.top_intents.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Top Intents
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.top_intents.slice(0, 3).map((intent, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {intent.intent} ({intent.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Policy Violations Breakdown */}
        {totalPolicyViolations > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Policy Violations
            </div>
            <div className="grid grid-cols-5 gap-1">
              {Object.entries(metrics.policy_violations).map(([policy, count]) => (
                <div
                  key={policy}
                  className={`text-center p-2 rounded ${count > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <div className={`text-sm font-bold ${count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {count}
                  </div>
                  <div className="text-xs text-muted-foreground">P{policy.split('_')[1]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Violation Rate */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Violation Rate</span>
            <span className={`font-bold ${metrics.violation_rate > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
              {formatPercentage(metrics.violation_rate)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentCallCard;
