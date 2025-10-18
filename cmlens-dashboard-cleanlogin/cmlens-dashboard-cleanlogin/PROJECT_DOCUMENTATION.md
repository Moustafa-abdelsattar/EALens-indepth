# CMLens - Agent Performance Analytics Platform
## Complete Project Documentation for AI Assistance

---

## 🎯 PROJECT OVERVIEW

### Core Objective
CMLens is a comprehensive enterprise-grade analytics platform designed to analyze agent performance across multiple KPIs. The application transforms raw performance data (Excel/CSV reports) into actionable business intelligence through automated scoring algorithms, data visualization, and AI-powered insights.

### Target Users
- Team leaders and managers
- Performance coaches
- Business analysts
- Executive stakeholders

### Business Value
- Data-driven decision making
- Performance optimization
- Individual coaching insights
- Team performance tracking
- Automated scoring and ranking

---

## 🏗️ TECHNICAL ARCHITECTURE

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI System**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom design system
- **Routing**: React Router DOM with protected routes
- **State Management**: Local state with React hooks, localStorage persistence
- **Data Fetching**: React Query (@tanstack/react-query)
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization

### Backend Stack
- **Framework**: Flask (Python) with CORS support
- **Data Processing**: Pandas-based ETL pipeline with PyArrow optimization
- **File Handling**: Secure upload with validation and cleanup
- **Production Server**: Gunicorn WSGI server

### Development Environment
- **Platform**: Replit with NixOS
- **Frontend Server**: Port 5000 (Vite dev server)
- **Backend Server**: Port 8080 (Flask API)
- **Package Management**: npm (frontend), pip (backend)

---

## 📊 DATA PROCESSING & ETL

### Input Data Sources
1. **Class Consumption Report** (CC%) - Agent engagement metrics
2. **Fixed Rate Report** (Fixed%) - Fixed rate performance
3. **Referral Report** - Referral generation metrics  
4. **Upgrade Report** (UP%) - Customer upgrade success rates

### Data Processing Pipeline
1. **File Upload**: Multi-file drag-and-drop interface
2. **Validation**: File format and content validation
3. **Column Mapping**: Automatic standardization of column names
4. **Data Merging**: Intelligent joining across multiple data sources
5. **Score Calculation**: Weighted KPI scoring algorithm
6. **Normalization**: Re-normalization for missing data scenarios

### Scoring Algorithm
- **Weighted System**: Configurable target thresholds
- **Performance Calculation**: Percentage-based scoring per KPI
- **Overall Score**: Weighted average across all KPIs
- **Status Classification**: Elite, Strong, Stable, Watch, Critical

### Status Definitions
- **Elite**: >90% overall performance
- **Strong**: 80-90% overall performance  
- **Stable**: 70-80% overall performance
- **Watch**: 60-70% overall performance
- **Critical**: <60% overall performance

---

## 🖥️ USER INTERFACE & FEATURES

### Navigation Structure
1. **Dashboard** - High-level overview and file upload
2. **Agents Performance** - Individual agent metrics and filtering
3. **Team Analytics** - Team-level insights and comparisons
4. **Meetings** - Meeting scheduler and tracking
5. **Calls** - Megaview integration for call management

### Core Features

#### Dashboard Page
- File upload interface (drag-and-drop)
- Processing status indicators
- Quick overview metrics
- Target configuration sliders

#### Agents Performance Page
- **Data Table**: Sortable agent performance table
- **Filtering Options**: 
  - By performance status (Elite, Strong, etc.)
  - By targets achieved (ranking filter)
  - Search functionality
- **Interactive Elements**:
  - Clickable agent names open detailed performance cards
  - Clickable status badges filter the view
- **Export Options**: Data export capabilities

#### Team Analytics Page
- **Overview Metrics**: Team summary statistics
- **Performance Visualizations**: 
  - Performance vs Target pie charts
  - Agent Status Distribution
- **Team Details**: 
  - Expandable team sections
  - Individual agent cards within teams
  - Clickable agent names for detailed views
- **Interactive Filtering**: Status-based filtering

#### Agent Detail Modal
- **Performance Breakdown**: Individual KPI scores
- **Ranking Explanation**: Why agent has their current status
- **Target Achievement**: Visual indicators for each target
- **Training Records**: Direct link to CM dashboard
- **Historical Context**: Performance trends

#### Meetings Page
- **Meeting Scheduler**: Calendar integration
- **Agent Assignment**: Link meetings to specific agents
- **Performance Context**: Pre-meeting agent insights

#### Calls Page
- **Megaview Integration**: Direct link to external call management
- **Authentication Handling**: Proper new-tab opening
- **Call Performance**: Integration with agent metrics

---

## 🔗 INTEGRATIONS

### External Tools
1. **Megaview** (https://app.megaview.com)
   - Call management and recording platform
   - Opens in new tab with authentication
   - Integrated via redirect (not iframe)

2. **CM Dashboard** (https://cm-dashboard.replit.app)
   - Training records and coaching materials
   - Context-aware agent linking
   - Accessible from agent detail cards

### Data Storage
- **Client-side**: localStorage for session persistence
- **Temporary**: Server-side file uploads with automatic cleanup
- **Processing**: In-memory data transformation

---

## 🎨 DESIGN SYSTEM

### Visual Design
- **Theme**: Glass morphism effects with modern UI
- **Color Coding**: Performance-based color schemes
- **Typography**: Clean, readable font hierarchy
- **Spacing**: Consistent spacing system
- **Responsive**: Mobile-first responsive design

### Component Library
- **Cards**: Information containers with glass effects
- **Buttons**: Primary, secondary, ghost variants
- **Badges**: Status indicators with color coding
- **Tables**: Sortable, filterable data tables
- **Modals**: Overlay dialogs for detailed views
- **Forms**: File upload, configuration forms

---

## 🔧 DEVELOPMENT SETUP

### File Structure
```
/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AgentDetailModal.tsx
│   │   └── AppSidebar.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── AgentsPerformance.tsx
│   │   ├── TeamAnalytics.tsx
│   │   ├── Meetings.tsx
│   │   └── Calls.tsx
│   ├── lib/              # Utility functions
│   └── App.tsx
├── web_backend.py        # Flask backend
├── script.py            # ETL processing logic
├── package.json
└── replit.md            # Project state tracking
```

### Key Dependencies
**Frontend:**
- react, react-dom, react-router-dom
- @radix-ui/* (UI primitives)
- @tanstack/react-query
- tailwindcss, lucide-react
- vite, typescript

**Backend:**
- flask, flask-cors
- pandas, numpy, openpyxl
- gunicorn (production)

---

## 🚀 DEPLOYMENT & WORKFLOWS

### Development Workflows
1. **Frontend Workflow**: `npm run dev` (Port 5000)
2. **Backend Workflow**: `PORT=8080 python web_backend.py` (Port 8080)

### Production Configuration
- **Deployment Target**: Autoscale (stateless)
- **Build Command**: `npm run build`
- **Run Command**: Production-ready server configuration
- **Environment**: Replit deployment infrastructure

---

## 📈 PERFORMANCE METRICS

### Key Performance Indicators (KPIs)
1. **CC%** - Class Consumption Rate
2. **Fixed%** - Fixed Rate Performance
3. **UP%** - Upgrade Success Rate
4. **SC%** - Service Completion Rate
5. **Referrals** - Referral Generation Count

### Calculation Methods
- **Individual Scores**: Percentage against target thresholds
- **Weighted Average**: Configurable weights per KPI
- **Team Averages**: Aggregated team performance
- **Status Assignment**: Threshold-based classification

---

## 🔐 AUTHENTICATION & SECURITY

### Current Implementation
- **Demo Authentication**: admin/admin credentials
- **Session Management**: localStorage-based persistence
- **Route Protection**: Automatic redirection for unauthenticated users
- **File Security**: Temporary upload storage with cleanup

### Security Considerations
- **File Validation**: Input sanitization and format checking
- **CORS Configuration**: Proper cross-origin handling
- **External Links**: Secure new-tab opening with noopener
- **Data Privacy**: No persistent server-side storage

---

## 🧪 TESTING & QUALITY

### Data Testing
- **File Format Validation**: Excel/CSV format checking
- **Column Mapping**: Flexible header recognition
- **Data Integrity**: Missing value handling
- **Score Calculation**: Weighted algorithm validation

### User Experience Testing
- **Interactive Elements**: Clickable components throughout app
- **Filtering Systems**: Status and ranking filters
- **Navigation Flow**: Seamless between pages
- **Modal Interactions**: Agent detail overlays

---

## 🔄 DATA FLOW

### Upload Process
1. User drags/drops files on Dashboard
2. Files sent to Flask backend via multipart form
3. Backend processes files with Pandas
4. Standardized data returned to frontend
5. Frontend stores processed data in localStorage
6. User navigates to view analytics

### Interactive Navigation
1. User clicks agent name anywhere in app
2. AgentDetailModal opens with full context
3. User can access training records
4. Modal closes, user returns to previous view
5. Filter states persist across navigation

### Status Filtering
1. User clicks status badge (e.g., "Critical")
2. Frontend filters data by selected status
3. All views update to show filtered subset
4. Charts and metrics recalculate
5. Clear filter returns to full dataset

---

## 🎯 USER STORIES & USE CASES

### Team Manager Use Cases
1. **Weekly Performance Review**: Upload latest reports, identify underperforming agents
2. **Coaching Preparation**: Click agent names to see detailed breakdowns
3. **Team Comparison**: Use Team Analytics to compare team performance
4. **Training Assignment**: Use training record links to assign coaching

### Individual Agent Analysis
1. **Performance Deep-dive**: Click agent name for detailed modal
2. **Target Achievement**: See which of 4 targets were met/missed
3. **Historical Context**: Understand ranking and status assignment
4. **Action Items**: Access training records for improvement

### Executive Reporting
1. **High-level Overview**: Dashboard metrics and team summaries
2. **Drill-down Analysis**: Click through to detailed agent views
3. **Status Distribution**: Understand agent performance spread
4. **Trend Analysis**: Track performance changes over time

---

## 🛠️ MAINTENANCE & TROUBLESHOOTING

### Common Issues
1. **File Upload Errors**: Check file format and column headers
2. **Missing Data**: ETL pipeline handles missing values gracefully
3. **Score Calculation**: Verify target thresholds and weights
4. **External Links**: Ensure Megaview/CM Dashboard accessibility

### Development Guidelines
- **Code Organization**: Maintain clean component structure
- **State Management**: Use localStorage for persistence
- **Error Handling**: Graceful degradation for missing data
- **Performance**: Optimize for large datasets (100+ agents)

---

## 📋 FUTURE ENHANCEMENTS

### Potential Features
1. **Advanced Analytics**: Trend analysis and forecasting
2. **Real-time Updates**: Live data refresh capabilities
3. **Enhanced Integrations**: Deeper API connections
4. **Mobile App**: Native mobile application
5. **Advanced Filtering**: Date ranges, custom criteria
6. **Automated Reporting**: Scheduled report generation

### Technical Improvements
1. **Database Integration**: Persistent data storage
2. **API Authentication**: Secure API access tokens
3. **Performance Optimization**: Large dataset handling
4. **Advanced Charts**: More visualization options
5. **Export Features**: PDF/Excel report generation

---

## 📞 SUPPORT INFORMATION

### For AI Assistants Working on This Project
- **Primary Files**: Focus on src/pages/* and web_backend.py
- **Data Structure**: localStorage format follows ETL pipeline output
- **Component Patterns**: Follow existing shadcn/ui patterns
- **State Management**: Use React hooks with localStorage sync
- **API Endpoints**: Single `/process-agent-data` endpoint for ETL
- **Error Handling**: Check logs via refresh_all_logs tool

### Key Context for Future Development
- **Interactive Design**: Everything should be clickable and connected
- **Performance Focus**: App designed for 100+ agent datasets
- **User Experience**: Managers need quick insights and drill-down capability
- **External Integration**: Megaview and CM Dashboard are external dependencies
- **Data Privacy**: No sensitive data stored server-side permanently

This documentation provides complete context for any AI assistant to understand and work effectively with the CMLens project.