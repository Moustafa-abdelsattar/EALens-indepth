export interface CallData {
  agent_id: string;
  agent_tone_sentiment: string;
  agent_turns: number;
  call_duration_seconds: number;
  compliance_score: number;
  conversation_complexity: string; // "low" | "medium" | "high"
  conversation_text: string;
  customer_id: string;
  customer_turns: number;
  detected_intent: string;
  detected_topic_id: number;
  detected_topic_name: string;
  has_violation: boolean;
  intent_confidence: number;
  processed_text: string;
  redline_policy_1: string; // "yes" | "no"
  redline_policy_2: string; // "yes" | "no"
  redline_policy_3: string; // "yes" | "no"
  redline_policy_4: string; // "yes" | "no"
  redline_policy_5: string; // "yes" | "no"
  risk_level: string; // "low" | "medium" | "high"
  text_quality_score: number;
  token_count: number;
  total_turns: number;
  unique_tokens: number;
}

export interface AgentCallMetrics {
  agent_id: string;
  total_calls: number;
  avg_compliance_score: number;
  avg_text_quality_score: number;
  avg_call_duration: number;
  avg_agent_turns: number;
  total_violations: number;
  violation_rate: number;
  risk_level_breakdown: {
    low: number;
    medium: number;
    high: number;
  };
  complexity_breakdown: {
    low: number;
    medium: number;
    high: number;
  };
  top_intents: Array<{
    intent: string;
    count: number;
  }>;
  policy_violations: {
    policy_1: number;
    policy_2: number;
    policy_3: number;
    policy_4: number;
    policy_5: number;
  };
}
