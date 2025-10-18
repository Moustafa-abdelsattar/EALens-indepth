# Targets and Meetings Features - Implementation Guide

## 🎯 **TARGETS TAB - Individual Agent Coaching**

**Main Purpose**: Deep-dive analysis tool for managers to coach individual agents with data-driven insights and action plans.

**Core Workflow**:
1. **Agent Selection**: Manager selects team from dropdown, then agent from filtered list
2. **Performance Dashboard**: Shows agent's overall score, category (Elite/Strong/Stable/Watch/Critical), total leads, calls, and issues
3. **Metric Analysis**: Displays 4 key performance indicators with color-coded visual cards:
   - **Fixed%**: Student retention rate (Target: >70%)
   - **CC%**: Class coverage rate - students reaching 12+ classes (Target: >60%)  
   - **SC%**: Success calls - super class consumption M1-M4 (Target: >30%)
   - **UP%**: Upselling rate - M-2 cumulative upgrade rate (Target: >15%)
4. **Visual Score Breakdown**: Pie chart showing weighted contribution of each metric to overall score
5. **Smart Recommendations**: Auto-generated improvement suggestions based on weak performance areas with specific action items
6. **Coaching Notes**: Persistent text area to save observations, action plans, and follow-up tasks per agent
7. **Team Comparison**: Statistical table comparing agent performance vs team averages

**Key Benefits**: Eliminates guesswork in coaching, provides data-driven action plans, tracks coaching history

---

## 🤝 **MEETINGS TAB - Weekly Team Performance Analysis**

**Main Purpose**: Weekly meeting preparation tool that identifies priority agents and generates discussion points.

**Core Workflow**:
1. **Week Selection**: Choose which week to analyze (typically last 4 weeks available)
2. **Performance Configuration**: Set underperformance threshold via slider (default 60%)
3. **Team Overview**: Dashboard showing total agents, underperforming count, average team score
4. **Priority Agent Identification**: Automatic sorting by performance score (lowest first)
5. **Agent Analysis Cards**: Expandable sections for each agent containing:
   - Performance metric breakdown with visual indicators
   - Weakness identification (metrics below threshold)
   - Meeting notes text area (saves per agent per week)
   - Discussion points and action items
6. **Team Performance Summary**: Table showing each team's average score and underperforming agent count
7. **Visual Analytics**: Bar chart of all agents with performance threshold line
8. **Report Export**: Generate downloadable meeting summary with all analysis

**Key Benefits**: Streamlines meeting preparation, ensures no agent is overlooked, provides structured discussion framework

---

## 🤖 **OPENROUTER API INTEGRATION** (AI Enhancement)

**Purpose**: Adds AI-powered coaching insights and discussion points to both features.

**API Configuration**:
- **Service**: OpenRouter.ai (AI model aggregation platform)
- **Model**: `anthropic/claude-3-haiku` (cost-effective, high-quality)
- **Required Secret**: `OPENROUTER_API_KEY`
- **Base URL**: `https://openrouter.ai/api/v1`

**How to Get API Key**:
1. Go to https://openrouter.ai
2. Sign up for account
3. Navigate to API Keys section
4. Generate new API key
5. Add to your environment as `OPENROUTER_API_KEY`

**AI Features**:

**For Targets Tab**:
- **Agent Performance Analysis**: AI reviews agent metrics and generates personalized coaching recommendations
- **Weakness Assessment**: AI identifies root causes behind poor performance areas
- **Action Plan Generation**: AI suggests specific, actionable improvement steps
- **Coaching Strategy**: AI recommends management approach based on performance level

**For Meetings Tab**:
- **Discussion Points**: AI generates specific talking points for each underperforming agent
- **Meeting Questions**: AI suggests constructive questions to ask during 1:1s
- **Team Insights**: AI analyzes team-wide patterns and suggests management strategies
- **Follow-up Recommendations**: AI proposes next steps and timelines for improvement

**Fallback System**: If API unavailable, system automatically uses rule-based analysis instead

**Cost Estimation**:
- Small team (50 agents): ~$10-20/month
- Medium team (200 agents): ~$40-80/month
- Large team (500 agents): ~$100-200/month

**Security**: API key stored as environment variable, never exposed in frontend

---

## 📊 **DATA REQUIREMENTS**

**Input Data**: Uses same agent data from your existing dashboard
- Agent names, teams, performance metrics (CC%, SC%, UP%, Fixed%)
- No additional data upload needed

**New Database Tables Needed**:
- `coaching_notes`: Store coaching observations per agent
- `meeting_notes`: Store meeting discussion points per agent per week

**Backend Endpoints Required**:
- Save/load coaching notes
- Save/load meeting notes  
- Generate meeting reports
- Optional: AI analysis endpoints

**Important Notes**:
- All percentage values should be stored as decimals (0.0-1.0) and displayed as percentages
- Features work offline without AI if OpenRouter API not configured
- Notes are persistent and searchable by agent/team/date
- Export functionality generates professional meeting reports

This gives managers powerful tools to transform raw performance data into actionable coaching insights and structured meeting agendas.