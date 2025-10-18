import { SalesData } from '@/types/salesData';
import { TeamMetrics, TeamSortField, SortDirection } from '@/types/teamsData';

/**
 * Aggregates individual agent SalesData into team-level metrics
 */
export function aggregateTeamMetrics(salesData: SalesData[]): TeamMetrics[] {
  // Group data by team
  const teamMap = new Map<string, SalesData[]>();

  salesData.forEach((data) => {
    const teamName = data.team || 'Unknown Team';
    if (!teamMap.has(teamName)) {
      teamMap.set(teamName, []);
    }
    teamMap.get(teamName)!.push(data);
  });

  // Calculate metrics for each team
  const teamMetrics: TeamMetrics[] = [];

  teamMap.forEach((teamMembers, teamName) => {
    const totalContractTarget = teamMembers.reduce(
      (sum, member) => sum + member.target_contract,
      0
    );
    const totalTargetCash = teamMembers.reduce(
      (sum, member) => sum + member.target_cash,
      0
    );
    const cashTotal = teamMembers.reduce(
      (sum, member) => sum + member.total_cash,
      0
    );
    const mtdContractTotal = teamMembers.reduce(
      (sum, member) => sum + member.total_salary_contract,
      0
    );

    // Calculate achievement percentages
    const cashTargetAchieved = totalTargetCash > 0 ? cashTotal / totalTargetCash : 0;
    const contractTargetAchieved =
      totalContractTarget > 0 ? mtdContractTotal / totalContractTarget : 0;

    // Calculate average unit price for the team
    const unitsPrice =
      teamMembers.reduce((sum, member) => sum + member.unit_price, 0) /
      teamMembers.length;

    teamMetrics.push({
      team: teamName,
      teams: teamName, // Alias for display
      totalContractTarget,
      totalTargetCash,
      cashTotal,
      cashTargetAchieved,
      mtdContractTotal,
      contractTargetAchieved,
      unitsPrice,
    });
  });

  return teamMetrics;
}

/**
 * Filters teams by search term (searches team name)
 */
export function filterTeamsBySearch(
  teams: TeamMetrics[],
  searchTerm: string
): TeamMetrics[] {
  if (!searchTerm.trim()) return teams;

  const term = searchTerm.toLowerCase();
  return teams.filter((team) => team.team.toLowerCase().includes(term));
}

/**
 * Sorts teams by specified field and direction
 */
export function sortTeams(
  teams: TeamMetrics[],
  sortBy: TeamSortField,
  direction: SortDirection = 'desc'
): TeamMetrics[] {
  const sorted = [...teams].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'team':
        comparison = a.team.localeCompare(b.team);
        break;
      case 'totalContractTarget':
        comparison = a.totalContractTarget - b.totalContractTarget;
        break;
      case 'totalTargetCash':
        comparison = a.totalTargetCash - b.totalTargetCash;
        break;
      case 'cashTotal':
        comparison = a.cashTotal - b.cashTotal;
        break;
      case 'cashTargetAchieved':
        comparison = a.cashTargetAchieved - b.cashTargetAchieved;
        break;
      case 'mtdContractTotal':
        comparison = a.mtdContractTotal - b.mtdContractTotal;
        break;
      case 'contractTargetAchieved':
        comparison = a.contractTargetAchieved - b.contractTargetAchieved;
        break;
      case 'unitsPrice':
        comparison = a.unitsPrice - b.unitsPrice;
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Formats currency values with commas and no decimals
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats percentage values (0.28 -> "28%")
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Gets CSS class for achievement percentage color coding
 */
export function getAchievementColorClass(achievement: number): string {
  if (achievement >= 1.0) return 'text-green-600 font-semibold'; // 100%+
  if (achievement >= 0.8) return 'text-yellow-600 font-semibold'; // 80-99%
  return 'text-red-600 font-semibold'; // < 80%
}

/**
 * Gets background color class for achievement badges
 */
export function getAchievementBgClass(achievement: number): string {
  if (achievement >= 1.0) return 'bg-green-100 text-green-800'; // 100%+
  if (achievement >= 0.8) return 'bg-yellow-100 text-yellow-800'; // 80-99%
  return 'bg-red-100 text-red-800'; // < 80%
}
