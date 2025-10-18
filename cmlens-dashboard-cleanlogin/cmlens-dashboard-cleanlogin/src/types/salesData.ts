export interface SalesData {
  members: string;
  team: string;
  target_cash: number;
  target_contract: number;
  usd: number;
  refund: number;
  usd_after_refund: number;
  contracts: number;
  salary_contracts: number;
  salary_contract_refund: number;
  total_salary_contract: number;
  installments: number;
  total_cash: number;
  bm: number;
  cash_achievement: number; // Stored as decimal (e.g., 0.37 for 37%)
  contract_achievement: number; // Stored as decimal (e.g., 0.40 for 40%)
  unit_price: number;
  cash_gap: number;
  contract_gap: number;
}

export interface AgentSalesProfile {
  agent_name: string;
  team: string;
  performance_metrics: {
    cash_achievement: number;
    contract_achievement: number;
    total_cash: number;
    total_contracts: number;
    unit_price: number;
  };
  targets: {
    target_cash: number;
    target_contract: number;
    cash_gap: number;
    contract_gap: number;
  };
  financial_details: {
    usd: number;
    refund: number;
    usd_after_refund: number;
    installments: number;
  };
  contracts: {
    contracts: number;
    salary_contracts: number;
    salary_contract_refund: number;
    total_salary_contract: number;
  };
  bonus_multiplier: number; // BM field
}
