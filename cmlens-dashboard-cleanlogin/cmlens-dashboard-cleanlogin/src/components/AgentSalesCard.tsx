import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  User,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  CreditCard,
  Wallet
} from "lucide-react";
import { AgentSalesProfile } from "@/types/salesData";

interface AgentSalesCardProps {
  profile: AgentSalesProfile;
  onClick?: () => void;
}

const AgentSalesCard: React.FC<AgentSalesCardProps> = ({ profile, onClick }) => {
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

  const getAchievementColor = (percentage: number) => {
    if (percentage >= 1) return 'text-green-600';
    if (percentage >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAchievementBadge = (percentage: number) => {
    if (percentage >= 1) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 0.8) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const cashAchievement = profile.performance_metrics.cash_achievement;
  const contractAchievement = profile.performance_metrics.contract_achievement;

  return (
    <Card
      className="glass-card hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-foreground">
                {profile.agent_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{profile.team}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-3 py-1 text-sm font-semibold"
          >
            BM: {profile.bonus_multiplier.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Achievement Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Cash</span>
              </div>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-xs ${getAchievementBadge(cashAchievement)}`}
              >
                {formatPercentage(cashAchievement)}
              </Badge>
            </div>
            <Progress value={cashAchievement * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(profile.performance_metrics.total_cash)}</span>
              <span>Goal: {formatCurrency(profile.targets.target_cash)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Contracts</span>
              </div>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-xs ${getAchievementBadge(contractAchievement)}`}
              >
                {formatPercentage(contractAchievement)}
              </Badge>
            </div>
            <Progress value={contractAchievement * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{profile.performance_metrics.total_contracts}</span>
              <span>Goal: {profile.targets.target_contract}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(profile.performance_metrics.unit_price)}
            </div>
            <div className="text-xs text-muted-foreground">Unit Price</div>
          </div>

          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {profile.contracts.contracts}
            </div>
            <div className="text-xs text-muted-foreground">Total Contracts</div>
          </div>

          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {profile.contracts.salary_contracts.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Salary Contracts</div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-2">Financial Breakdown</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">USD:</span>
              <span className="font-medium">{formatCurrency(profile.financial_details.usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund:</span>
              <span className="font-medium text-red-600">{formatCurrency(profile.financial_details.refund)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After Refund:</span>
              <span className="font-medium">{formatCurrency(profile.financial_details.usd_after_refund)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installments:</span>
              <span className="font-medium">{profile.financial_details.installments}</span>
            </div>
          </div>
        </div>

        {/* Gaps */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {profile.targets.cash_gap > 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-muted-foreground">Cash Gap:</span>
            </div>
            <span className={`text-sm font-bold ${profile.targets.cash_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {profile.targets.cash_gap > 0 ? '+' : ''}{formatCurrency(Math.abs(profile.targets.cash_gap))}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {profile.targets.contract_gap > 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-muted-foreground">Contract Gap:</span>
            </div>
            <span className={`text-sm font-bold ${profile.targets.contract_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {profile.targets.contract_gap > 0 ? '+' : ''}{Math.abs(profile.targets.contract_gap)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentSalesCard;
