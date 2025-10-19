import { CallData, AgentCallMetrics } from "@/types/callData";
import * as XLSX from 'xlsx';

/**
 * Parses Excel file and converts it to CallData array
 */
export function parseCallDataFromExcel(file: File): Promise<CallData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const calls: CallData[] = jsonData.map((row: any) => {
          // Parse compliance score - check if it's inverted based on violation flag
          let complianceScore = Number(row.compliance_score) || 0;
          const hasViolation = row.has_violation === true || row.has_violation === 'TRUE' || row.has_violation === 'true';

          // If compliance_score is binary (0 or 1) and inversely correlated with violations,
          // invert it: 1 becomes 0 (non-compliant if has violation), 0 becomes 1 (compliant if no violation)
          if (complianceScore === 1 && hasViolation) {
            complianceScore = 0; // Has violation means non-compliant
          } else if (complianceScore === 0 && !hasViolation) {
            complianceScore = 1; // No violation means compliant
          }

          return {
          agent_id: String(row.agent_id || ''),
          agent_tone_sentiment: String(row.agent_tone_sentiment || ''),
          agent_turns: Number(row.agent_turns) || 0,
          call_duration_seconds: Number(row.call_duration_seconds) || 0,
          compliance_score: complianceScore,
          conversation_complexity: String(row.conversation_complexity || 'medium'),
          conversation_text: String(row.conversation_text || ''),
          customer_id: String(row.customer_id || ''),
          customer_turns: Number(row.customer_turns) || 0,
          detected_intent: String(row.detected_intent || ''),
          detected_topic_id: Number(row.detected_topic_id) || 0,
          detected_topic_name: String(row.detected_topic_name || ''),
          has_violation: row.has_violation === true || row.has_violation === 'TRUE' || row.has_violation === 'true',
          intent_confidence: Number(row.intent_confidence) || 0,
          processed_text: String(row.processed_text || ''),
          redline_policy_1: String(row.redline_policy_1 || 'no').toLowerCase(),
          redline_policy_2: String(row.redline_policy_2 || 'no').toLowerCase(),
          redline_policy_3: String(row.redline_policy_3 || 'no').toLowerCase(),
          redline_policy_4: String(row.redline_policy_4 || 'no').toLowerCase(),
          redline_policy_5: String(row.redline_policy_5 || 'no').toLowerCase(),
          risk_level: String(row.risk_level || 'low').toLowerCase(),
          text_quality_score: Number(row.text_quality_score) || 0,
          token_count: Number(row.token_count) || 0,
          total_turns: Number(row.total_turns) || 0,
          unique_tokens: Number(row.unique_tokens) || 0,
        };
        });

        resolve(calls);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Aggregates call data by agent to calculate metrics
 */
export function aggregateCallDataByAgent(calls: CallData[]): AgentCallMetrics[] {
  const agentMap = new Map<string, CallData[]>();

  // Group calls by agent
  calls.forEach(call => {
    const agentCalls = agentMap.get(call.agent_id) || [];
    agentCalls.push(call);
    agentMap.set(call.agent_id, agentCalls);
  });

  // Calculate metrics for each agent
  const agentMetrics: AgentCallMetrics[] = [];

  agentMap.forEach((agentCalls, agent_id) => {
    const total_calls = agentCalls.length;

    // Average compliance score
    // Handle both binary (0/1) and percentage (0-100) formats
    const rawComplianceScore = agentCalls.reduce((sum, call) => sum + call.compliance_score, 0) / total_calls;
    const avg_compliance_score = rawComplianceScore <= 1
      ? rawComplianceScore * 100  // Convert binary/decimal to percentage
      : rawComplianceScore;        // Already in percentage format

    // Average text quality score
    const avg_text_quality_score = agentCalls.reduce((sum, call) => sum + call.text_quality_score, 0) / total_calls;

    // Average call duration
    const avg_call_duration = agentCalls.reduce((sum, call) => sum + call.call_duration_seconds, 0) / total_calls;

    // Average agent turns
    const avg_agent_turns = agentCalls.reduce((sum, call) => sum + call.agent_turns, 0) / total_calls;

    // Total violations
    const total_violations = agentCalls.filter(call => call.has_violation).length;

    // Violation rate
    const violation_rate = total_violations / total_calls;

    // Risk level breakdown
    const risk_level_breakdown = {
      low: agentCalls.filter(call => call.risk_level.toLowerCase() === 'low').length,
      medium: agentCalls.filter(call => call.risk_level.toLowerCase() === 'medium').length,
      high: agentCalls.filter(call => call.risk_level.toLowerCase() === 'high').length,
    };

    // Complexity breakdown
    const complexity_breakdown = {
      low: agentCalls.filter(call => call.conversation_complexity.toLowerCase() === 'low').length,
      medium: agentCalls.filter(call => call.conversation_complexity.toLowerCase() === 'medium').length,
      high: agentCalls.filter(call => call.conversation_complexity.toLowerCase() === 'high').length,
    };

    // Top intents
    const intentMap = new Map<string, number>();
    agentCalls.forEach(call => {
      const count = intentMap.get(call.detected_intent) || 0;
      intentMap.set(call.detected_intent, count + 1);
    });

    const top_intents = Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Policy violations
    const policy_violations = {
      policy_1: agentCalls.filter(call => call.redline_policy_1 === 'yes').length,
      policy_2: agentCalls.filter(call => call.redline_policy_2 === 'yes').length,
      policy_3: agentCalls.filter(call => call.redline_policy_3 === 'yes').length,
      policy_4: agentCalls.filter(call => call.redline_policy_4 === 'yes').length,
      policy_5: agentCalls.filter(call => call.redline_policy_5 === 'yes').length,
    };

    agentMetrics.push({
      agent_id,
      total_calls,
      avg_compliance_score,
      avg_text_quality_score,
      avg_call_duration,
      avg_agent_turns,
      total_violations,
      violation_rate,
      risk_level_breakdown,
      complexity_breakdown,
      top_intents,
      policy_violations,
    });
  });

  return agentMetrics;
}

/**
 * Parses CSV data and converts it to CallData array
 * Note: You'll need to use a CSV parsing library or implement parsing logic
 */
export function parseCallDataFromCSV(csvText: string): CallData[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split('\t'); // Assuming tab-separated

  const calls: CallData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');

    if (values.length !== headers.length) continue;

    const call: any = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();

      // Handle different data types
      switch (header.trim()) {
        case 'agent_turns':
        case 'call_duration_seconds':
        case 'customer_turns':
        case 'detected_topic_id':
        case 'token_count':
        case 'total_turns':
        case 'unique_tokens':
          call[header.trim()] = parseInt(value) || 0;
          break;

        case 'compliance_score':
        case 'intent_confidence':
        case 'text_quality_score':
          call[header.trim()] = parseFloat(value) || 0;
          break;

        case 'has_violation':
          call[header.trim()] = value.toLowerCase() === 'true';
          break;

        default:
          call[header.trim()] = value || '';
      }
    });

    calls.push(call as CallData);
  }

  return calls;
}

/**
 * Filters agents by various criteria
 */
export function filterAgentMetrics(
  metrics: AgentCallMetrics[],
  filters: {
    minComplianceScore?: number;
    maxViolationRate?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    minCalls?: number;
  }
): AgentCallMetrics[] {
  return metrics.filter(agent => {
    if (filters.minComplianceScore !== undefined && agent.avg_compliance_score < filters.minComplianceScore) {
      return false;
    }

    if (filters.maxViolationRate !== undefined && agent.violation_rate > filters.maxViolationRate) {
      return false;
    }

    if (filters.minCalls !== undefined && agent.total_calls < filters.minCalls) {
      return false;
    }

    if (filters.riskLevel) {
      const dominantRisk = Object.entries(agent.risk_level_breakdown)
        .reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0];

      if (dominantRisk !== filters.riskLevel) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts agent metrics by various criteria
 */
export function sortAgentMetrics(
  metrics: AgentCallMetrics[],
  sortBy: 'compliance' | 'quality' | 'violations' | 'calls' | 'duration',
  order: 'asc' | 'desc' = 'desc'
): AgentCallMetrics[] {
  const sorted = [...metrics].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'compliance':
        comparison = a.avg_compliance_score - b.avg_compliance_score;
        break;
      case 'quality':
        comparison = a.avg_text_quality_score - b.avg_text_quality_score;
        break;
      case 'violations':
        comparison = a.violation_rate - b.violation_rate;
        break;
      case 'calls':
        comparison = a.total_calls - b.total_calls;
        break;
      case 'duration':
        comparison = a.avg_call_duration - b.avg_call_duration;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}
