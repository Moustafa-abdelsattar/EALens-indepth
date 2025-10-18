import * as XLSX from 'xlsx';
import { SalesData, AgentSalesProfile } from '@/types/salesData';

/**
 * Parses Excel file and converts it to SalesData array
 */
export function parseSalesDataFromExcel(file: File): Promise<SalesData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const salesData: SalesData[] = jsonData.map((row: any) => {
          // Parse percentage strings (e.g., "37%" -> 0.37)
          const parsePercentage = (val: any): number => {
            if (typeof val === 'string' && val.includes('%')) {
              return parseFloat(val.replace('%', '')) / 100;
            }
            if (typeof val === 'number' && val <= 1) {
              return val; // Already a decimal
            }
            if (typeof val === 'number' && val > 1) {
              return val / 100; // Convert percentage number to decimal
            }
            return 0;
          };

          // Parse currency strings (e.g., "$8,980" -> 8980)
          const parseCurrency = (val: any): number => {
            if (typeof val === 'string') {
              return parseFloat(val.replace(/[$,]/g, '')) || 0;
            }
            return Number(val) || 0;
          };

          return {
            members: String(row.Members || row.members || ''),
            team: String(row.Team || row.team || ''),
            target_cash: parseCurrency(row['Target Cash'] || row.target_cash),
            target_contract: Number(row['Target Contract'] || row.target_contract) || 0,
            usd: parseCurrency(row.USD || row.usd),
            refund: parseCurrency(row.Refund || row.refund),
            usd_after_refund: parseCurrency(row['USD After Refund'] || row.usd_after_refund),
            contracts: Number(row.Contracts || row.contracts) || 0,
            salary_contracts: Number(row['Salary Contracts'] || row.salary_contracts) || 0,
            salary_contract_refund: Number(row['Salary Contract Refund'] || row.salary_contract_refund) || 0,
            total_salary_contract: Number(row['Total Salary Contract'] || row.total_salary_contract) || 0,
            installments: Number(row.Installments || row.installments) || 0,
            total_cash: parseCurrency(row['Total Cash'] || row.total_cash),
            bm: Number(row.BM || row.bm) || 0,
            cash_achievement: parsePercentage(row['Cash achievement'] || row.cash_achievement),
            contract_achievement: parsePercentage(row['Contract Achievement'] || row.contract_achievement),
            unit_price: parseCurrency(row['Unit Price'] || row.unit_price),
            cash_gap: parseCurrency(row['Cash Gap'] || row.cash_gap),
            contract_gap: Number(row['Contract Gap'] || row.contract_gap) || 0,
          };
        });

        resolve(salesData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Converts SalesData to AgentSalesProfile for better UI presentation
 */
export function convertToAgentProfile(salesData: SalesData): AgentSalesProfile {
  return {
    agent_name: salesData.members,
    team: salesData.team,
    performance_metrics: {
      cash_achievement: salesData.cash_achievement,
      contract_achievement: salesData.contract_achievement,
      total_cash: salesData.total_cash,
      total_contracts: salesData.contracts,
      unit_price: salesData.unit_price,
    },
    targets: {
      target_cash: salesData.target_cash,
      target_contract: salesData.target_contract,
      cash_gap: salesData.cash_gap,
      contract_gap: salesData.contract_gap,
    },
    financial_details: {
      usd: salesData.usd,
      refund: salesData.refund,
      usd_after_refund: salesData.usd_after_refund,
      installments: salesData.installments,
    },
    contracts: {
      contracts: salesData.contracts,
      salary_contracts: salesData.salary_contracts,
      salary_contract_refund: salesData.salary_contract_refund,
      total_salary_contract: salesData.total_salary_contract,
    },
    bonus_multiplier: salesData.bm,
  };
}

/**
 * Filters agents by search term
 */
export function filterAgentsBySearch(
  profiles: AgentSalesProfile[],
  searchTerm: string
): AgentSalesProfile[] {
  if (!searchTerm.trim()) return profiles;

  const term = searchTerm.toLowerCase();
  return profiles.filter(
    (profile) =>
      profile.agent_name.toLowerCase().includes(term) ||
      profile.team.toLowerCase().includes(term)
  );
}

/**
 * Sorts agents by various criteria
 */
export function sortAgents(
  profiles: AgentSalesProfile[],
  sortBy: 'name' | 'cash_achievement' | 'contract_achievement' | 'total_cash' | 'team',
  order: 'asc' | 'desc' = 'desc'
): AgentSalesProfile[] {
  const sorted = [...profiles].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.agent_name.localeCompare(b.agent_name);
        break;
      case 'cash_achievement':
        comparison = a.performance_metrics.cash_achievement - b.performance_metrics.cash_achievement;
        break;
      case 'contract_achievement':
        comparison = a.performance_metrics.contract_achievement - b.performance_metrics.contract_achievement;
        break;
      case 'total_cash':
        comparison = a.performance_metrics.total_cash - b.performance_metrics.total_cash;
        break;
      case 'team':
        comparison = a.team.localeCompare(b.team);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}
