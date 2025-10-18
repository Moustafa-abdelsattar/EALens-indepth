// API service for CMLens backend integration

const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  // In local development, use Python Flask backend on port 8080
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:8080`;
  }
  
  // In Replit development environment, backend runs on port 8080
  // Check for both replit.dev and Replit environment characteristics
  const isReplit = hostname.includes('replit.dev') || hostname.includes('janeway.replit.dev');
  const isFrontendPort = port === '5000' || port === '';
  
  if (isReplit && isFrontendPort) {
    // Use the same hostname but switch to port 8080 for backend
    return `${protocol}//${hostname}:8080`;
  }
  
  // In production deployment, frontend and backend are served from same origin
  return `${window.location.origin}`;
})();

export interface ProcessDataResponse {
  agents: AgentData[];
}

export interface AgentData {
  id: string;
  name: string;
  team: string;
  group: string;
  students: number;
  ccPct: number | null;
  scPct: number | null;
  upPct: number | null;
  fixedPct: number | null;
  referralLeads: number;
  referralShowups: number;
  referralPaid: number;
  referralAchPct: number | null; // Referral achievement percentage from leads ach% column
  conversionRate: number | null; // Conversion rate: recovered/total leads
  totalLeads: number;
  recoveredLeads: number;
  unrecoveredLeads: number;
  unrecoveredStudents: Array<{
    studentId: string;
    noteTime: string;
  }>;
}

export class ApiService {
  static async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Backend is not available');
    }
    return response.json();
  }

  static async processAgentData(files: {
    classConsumption?: File;
    fixed?: File;
    referral?: File;
    upgrade?: File;
    allLeads?: File;
  }): Promise<ProcessDataResponse> {
    console.log('🚀 API: Starting processAgentData...');
    console.log('🚀 API: Files to upload:', Object.keys(files));
    console.log('🚀 API: API_BASE_URL:', API_BASE_URL);
    
    const formData = new FormData();
    
    // Add files to form data
Object.entries(files).forEach(([key, file]) => {
      if (file) {
        const keyMap: Record<string, string> = {
          classConsumption: 'cc_file',
          upgrade: 'up_file',
          referral: 're_file',
          fixed: 'fixed_file',
          allLeads: 'all_leads_file',
        };
        const backendKey = keyMap[key] || key;
        console.log(`🚀 API: Adding file ${key} -> ${backendKey}:`, file.name);
        formData.append(backendKey, file);
      }
    });

    console.log('🚀 API: Making request to:', `${API_BASE_URL}/api/process-agent-data`);

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🚀 API: Added auth token to request');
    } else {
      console.warn('⚠️ API: No auth token found in localStorage');
    }

    const response = await fetch(`${API_BASE_URL}/api/process-agent-data`, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.log('🚀 API: Response status:', response.status);
    console.log('🚀 API: Response OK:', response.ok);

    // Check if response is valid before parsing JSON
    if (!response.ok) {
      let errorMessage = 'Failed to process data';
      try {
        const result = await response.json();
        errorMessage = result.error || errorMessage;
        console.log('🚀 API: Error response:', result);
      } catch (parseError) {
        // If we can't parse the error response, use a generic message
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
        console.log('🚀 API: Parse error:', parseError);
      }
      throw new Error(errorMessage);
    }

    // Parse the successful response
    try {
      const result = await response.json();
      console.log('🚀 API: Success response received, agents count:', result.agents?.length);
      return result;
    } catch (parseError) {
      console.log('🚀 API: Parse error on success:', parseError);
      throw new Error('Failed to parse server response - please try again');
    }
  }

  static async getTestFormat(): Promise<ProcessDataResponse> {
    const response = await fetch(`${API_BASE_URL}/api/test-format`);
    if (!response.ok) {
      throw new Error('Failed to get test format');
    }
    return response.json();
  }
}

// Export the API_BASE_URL for direct use
export { API_BASE_URL };

export default ApiService;