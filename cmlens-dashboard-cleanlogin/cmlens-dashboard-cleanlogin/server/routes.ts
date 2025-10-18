import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import FormData from "form-data";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, approvedEmails, uploadLogs, agentDataCache } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

// Extend Express Request type to include multer file uploads
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

// JWT secret - in production, use a strong secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for handling multipart/form-data
  const upload = multer();

  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Check if email is in approved list
      const approvedEmail = await db.select()
        .from(approvedEmails)
        .where(eq(approvedEmails.email, email.toLowerCase()))
        .limit(1);

      if (approvedEmail.length === 0) {
        return res.status(403).json({ message: "Email not approved for signup. Please contact an administrator." });
      }

      // Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Get pre-assigned role and team from approved_emails
      const assignedRole = approvedEmail[0].role || 0;
      const assignedTeam = approvedEmail[0].teamName;

      // Create user with inherited role and team
      const newUser = await db.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: assignedRole,
        teamName: assignedTeam,
      }).returning();

      // Generate JWT token with role information
      const token = jwt.sign(
        {
          userId: newUser[0].id,
          email: newUser[0].email,
          role: newUser[0].role,
          teamName: newUser[0].teamName
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          firstName: newUser[0].firstName,
          lastName: newUser[0].lastName,
          role: newUser[0].role,
          teamName: newUser[0].teamName,
          createdAt: newUser[0].createdAt,
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is active
      if (!user[0].isActive) {
        return res.status(403).json({ message: "Account is deactivated. Please contact an administrator." });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user[0].passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Get latest role and team from approved_emails (source of truth)
      const approvedEmail = await db.select()
        .from(approvedEmails)
        .where(eq(approvedEmails.email, email.toLowerCase()))
        .limit(1);

      const currentRole = approvedEmail.length > 0 ? approvedEmail[0].role : 0;
      const currentTeam = approvedEmail.length > 0 ? approvedEmail[0].teamName : null;

      // Generate JWT token with role information
      const token = jwt.sign(
        {
          userId: user[0].id,
          email: user[0].email,
          role: currentRole,
          teamName: currentTeam
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName,
          lastName: user[0].lastName,
          role: currentRole,
          teamName: currentTeam,
          createdAt: user[0].createdAt,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout endpoint (client-side token removal is main mechanism)
  app.post('/api/auth/logout', authenticateToken, async (req: any, res: any) => {
    res.json({ message: "Logout successful" });
  });

  // Get current user endpoint
  app.get('/api/auth/user', authenticateToken, async (req: any, res: any) => {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get latest role and team from approved_emails (source of truth)
      const approvedEmail = await db.select()
        .from(approvedEmails)
        .where(eq(approvedEmails.email, user[0].email))
        .limit(1);

      const currentRole = approvedEmail.length > 0 ? approvedEmail[0].role : 0;
      const currentTeam = approvedEmail.length > 0 ? approvedEmail[0].teamName : null;

      res.json({
        id: user[0].id,
        email: user[0].email,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        role: currentRole,
        teamName: currentTeam,
        createdAt: user[0].createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Proxy data processing to existing Python backend and cache results
  app.post('/api/process-agent-data', authenticateToken, upload.any(), async (req: any, res: Response) => {
    const fileName = 'uploaded_file';
    const fileSize = 0;

    try {
      console.log('Received file upload request, proxying to Flask backend...');
      const multerReq = req as MulterRequest;
      const uploadedFile = multerReq.files?.[0];
      console.log('Files received:', multerReq.files?.length || 0);

      // Create FormData to properly forward multipart data
      const formData = new FormData();

      // Add files to FormData
      if (multerReq.files && Array.isArray(multerReq.files)) {
        multerReq.files.forEach((file: Express.Multer.File) => {
          console.log(`Adding file: ${file.fieldname} -> ${file.originalname}`);
          formData.append(file.fieldname, file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
          });
        });
      }

      // Forward request to Python backend on port 8081
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:8081/process-agent-data', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      console.log('Flask backend response status:', response.status);

      if (!response.ok) {
        console.error('Flask backend error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Flask error details:', errorText);

        // Log failed upload
        await db.insert(uploadLogs).values({
          userId: req.user.userId,
          userEmail: req.user.email,
          fileName: uploadedFile?.originalname || fileName,
          fileSize: uploadedFile?.size || fileSize,
          rowsProcessed: 0,
          status: 'error',
          errorMessage: errorText,
        });

        return res.status(response.status).json({
          error: `Backend service error: ${response.statusText}`,
          details: errorText
        });
      }

      const data: any = await response.json();
      console.log('Successfully proxied request to Flask backend');
      console.log('📦 Flask response data structure:', typeof data, Array.isArray(data) ? 'is array' : 'is object');
      console.log('📦 Flask response keys:', data ? Object.keys(data) : 'null');

      // Determine the agents array from Flask response
      let agentsArray: any[] = [];
      if (Array.isArray(data)) {
        agentsArray = data;
      } else if (data && typeof data === 'object' && 'agents' in data && Array.isArray(data.agents)) {
        agentsArray = data.agents;
      } else if (data && typeof data === 'object') {
        // If it's an object but not with agents key, try to convert it
        console.log('📦 Data is object but not array, converting...');
        agentsArray = [data];
      }

      console.log(`📦 Agents to cache: ${agentsArray.length}`);

      // Save processed data to agent_data_cache
      if (agentsArray.length > 0) {
        console.log(`💾 Caching ${agentsArray.length} agent records to PostgreSQL...`);

        // Clear old data before inserting new (or use upsert logic)
        await db.delete(agentDataCache);

        // Insert new agent data
        for (const agent of agentsArray) {
          await db.insert(agentDataCache).values({
            agentName: agent.agentName || agent.name || 'Unknown',
            agentId: agent.agentId || agent.id || null,
            teamName: agent.teamName || agent.team || null,
            status: agent.status || null,
            averageScore: agent.averageScore?.toString() || null,
            totalCalls: agent.totalCalls || null,
            answeredCalls: agent.answeredCalls || null,
            missedCalls: agent.missedCalls || null,
            callDurationAvg: agent.callDurationAvg?.toString() || null,
            data: agent, // Store full JSON
            uploadedBy: req.user.userId,
          });
        }

        console.log('✅ Agent data cached successfully');
      } else {
        console.warn('⚠️ No agent data to cache');
      }

      // Log successful upload
      await db.insert(uploadLogs).values({
        userId: req.user.userId,
        userEmail: req.user.email,
        fileName: uploadedFile?.originalname || fileName,
        fileSize: uploadedFile?.size || fileSize,
        rowsProcessed: agentsArray.length,
        status: 'success',
        errorMessage: null,
      });

      res.json(data);
    } catch (error) {
      console.error('Error proxying to Python backend:', error);

      // Log failed upload
      try {
        await db.insert(uploadLogs).values({
          userId: req.user.userId,
          userEmail: req.user.email,
          fileName,
          fileSize,
          rowsProcessed: 0,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (logError) {
        console.error('Error logging failed upload:', logError);
      }

      res.status(500).json({
        error: "Data processing service unavailable",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get cached agent data (filtered by team for Team Viewers)
  app.get('/api/agent-data', authenticateToken, async (req: any, res: Response) => {
    try {
      // Get latest role and team from approved_emails
      const user = await db.select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const approvedEmail = await db.select()
        .from(approvedEmails)
        .where(eq(approvedEmails.email, user[0].email))
        .limit(1);

      const currentRole = approvedEmail.length > 0 ? approvedEmail[0].role : 0;
      const currentTeam = approvedEmail.length > 0 ? approvedEmail[0].teamName : null;

      // Fetch agent data from cache
      let agentData = await db.select().from(agentDataCache).orderBy(desc(agentDataCache.updatedAt));

      // Filter by team for Team Viewers (role 1)
      if (currentRole === 1 && currentTeam) {
        agentData = agentData.filter(agent => agent.teamName === currentTeam);
        console.log(`Filtered data for team viewer: ${currentTeam}, ${agentData.length} records`);
      }

      // Return the cached data (JSONB field contains full agent info)
      const responseData = agentData.map(agent => agent.data);
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching agent data:', error);
      res.status(500).json({
        error: "Failed to fetch agent data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get upload logs (for admin/developers)
  app.get('/api/upload-logs', authenticateToken, async (req: any, res: Response) => {
    try {
      const logs = await db.select().from(uploadLogs).orderBy(desc(uploadLogs.uploadedAt)).limit(100);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching upload logs:', error);
      res.status(500).json({
        error: "Failed to fetch upload logs",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      // Check database connection
      await db.select().from(users).limit(1);
      res.json({
        status: 'ok',
        message: 'Backend is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Backend is unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test format endpoint (returns sample data structure)
  app.get('/api/test-format', async (req: Request, res: Response) => {
    res.json({
      agents: [
        {
          id: 'SAMPLE001',
          name: 'Sample Agent',
          team: 'Sample Team',
          group: 'Sample Group',
          students: 0,
          ccPct: null,
          scPct: null,
          upPct: null,
          fixedPct: null,
          referralLeads: 0,
          referralShowups: 0,
          referralPaid: 0,
          referralAchPct: null,
          conversionRate: null,
          totalLeads: 0,
          recoveredLeads: 0,
          unrecoveredLeads: 0,
          unrecoveredStudents: []
        }
      ]
    });
  });

  // AI analysis endpoint (placeholder for future AI integration)
  app.post('/api/ai-analysis', authenticateToken, async (req: any, res: Response) => {
    try {
      const { type, agent_data } = req.body;

      if (type === 'meeting') {
        // TODO: Integrate with AI service (OpenAI, Anthropic, etc.)
        // For now, return a mock response
        const mockAnalysis = `Meeting Preparation Notes for ${agent_data.name}

Performance Overview:
- Current Score: ${agent_data.score}%
- Status: ${agent_data.category}
- Team: ${agent_data.team}

Key Areas of Focus:
${agent_data.weaknesses.map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}

Recommended Discussion Points:
1. Review recent performance trends and identify root causes
2. Set specific, measurable goals for improvement
3. Discuss any support or resources needed
4. Create an action plan with clear milestones

Follow-up Actions:
- Schedule progress check-in within 2 weeks
- Document agreed-upon goals and timeline
- Share relevant training materials or resources`;

        res.json({
          success: true,
          analysis: mockAnalysis
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid analysis type'
        });
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate AI analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve static files from the React build
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use(express.static(path.join(__dirname, '../dist')));

  // Handle SPA routing - serve index.html for all non-API routes
  app.use((req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    // Only handle GET requests for SPA
    if (req.method === 'GET') {
      return res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    }
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}