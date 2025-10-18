/**
 * Team metrics interface for aggregated team performance data
 */
export interface TeamMetrics {
  /** Team identifier/name */
  team: string;

  /** Team name display (alias for team) */
  teams: string;

  /** Total contract target across all team members */
  totalContractTarget: number;

  /** Total target cash across all team members */
  totalTargetCash: number;

  /** Total cash achieved */
  cashTotal: number;

  /** Cash target achievement percentage (0-1 range, e.g., 0.28 = 28%) */
  cashTargetAchieved: number;

  /** Month-to-date contract total */
  mtdContractTotal: number;

  /** Contract target achievement percentage (0-1 range) */
  contractTargetAchieved: number;

  /** Average or total units price for the team */
  unitsPrice: number;
}

/**
 * Sort options for teams table
 */
export type TeamSortField =
  | 'team'
  | 'totalContractTarget'
  | 'totalTargetCash'
  | 'cashTotal'
  | 'cashTargetAchieved'
  | 'mtdContractTotal'
  | 'contractTargetAchieved'
  | 'unitsPrice';

export type SortDirection = 'asc' | 'desc';
