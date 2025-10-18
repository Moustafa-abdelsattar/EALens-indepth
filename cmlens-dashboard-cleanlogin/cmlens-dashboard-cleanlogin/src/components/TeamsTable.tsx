import { TeamMetrics, TeamSortField, SortDirection } from '@/types/teamsData';
import {
  formatCurrency,
  formatPercentage,
  getAchievementBgClass,
} from '@/utils/teamsDataUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamsTableProps {
  teams: TeamMetrics[];
  sortBy: TeamSortField;
  sortDirection: SortDirection;
  onSort: (field: TeamSortField) => void;
}

export function TeamsTable({
  teams,
  sortBy,
  sortDirection,
  onSort,
}: TeamsTableProps) {
  const getSortIcon = (field: TeamSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: TeamSortField;
    children: React.ReactNode;
  }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => onSort(field)}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        {children}
        {getSortIcon(field)}
      </Button>
    </TableHead>
  );

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No teams data available. Please upload an Excel file to view team metrics.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <SortableHeader field="team">Team</SortableHeader>
            <TableHead>Teams</TableHead>
            <SortableHeader field="totalContractTarget">
              Total Contract Target
            </SortableHeader>
            <SortableHeader field="totalTargetCash">
              Total Target Cash
            </SortableHeader>
            <SortableHeader field="cashTotal">Cash Total</SortableHeader>
            <SortableHeader field="cashTargetAchieved">
              Cash Target Achieved
            </SortableHeader>
            <SortableHeader field="mtdContractTotal">
              MTD Contract Total
            </SortableHeader>
            <SortableHeader field="contractTargetAchieved">
              Contract Target Achieved
            </SortableHeader>
            <SortableHeader field="unitsPrice">Units Price</SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team, index) => (
            <TableRow key={index} className="hover:bg-muted/30">
              <TableCell className="font-medium">{team.team}</TableCell>
              <TableCell className="text-muted-foreground">
                {team.teams}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(team.totalContractTarget)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(team.totalTargetCash)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(team.cashTotal)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={getAchievementBgClass(team.cashTargetAchieved)}
                >
                  {formatPercentage(team.cashTargetAchieved)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(team.mtdContractTotal)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={getAchievementBgClass(team.contractTargetAchieved)}
                >
                  {formatPercentage(team.contractTargetAchieved)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(team.unitsPrice)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
