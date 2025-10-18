import express from "express";
import { createServer } from "http";
import multer from "multer";
import FormData from "form-data";
import { AuthStoreError } from "./staticAuthStore.js";
function isAuthStoreError(error) {
    return error instanceof AuthStoreError;
}
function mapAuthError(error) {
    switch (error.code) {
        case "NOT_ALLOWED":
            return { status: 403, message: "This email is not allowed to access CMLens.", code: error.code };
        case "ALREADY_REGISTERED":
            return { status: 409, message: "Account already registered. Please sign in instead.", code: error.code };
        case "ACCESS_REVOKED":
            return { status: 403, message: "Access has been revoked. Contact the administrator.", code: error.code };
        case "PASSWORD_NOT_SET":
            return { status: 403, message: "Password has not been set for this account.", code: error.code };
        case "INVALID_CREDENTIALS":
        default:
            return { status: 401, message: "Incorrect email or password.", code: "INVALID_CREDENTIALS" };
    }
}
function validateEmail(email) {
    return typeof email === "string" && email.includes("@");
}
function validatePassword(password) {
    return typeof password === "string" && password.length >= 6;
}
async function authenticateRequest(req, res, authStore) {
    const sessionEmail = req.session.userEmail;
    if (!sessionEmail) {
        res.status(401).json({ message: "Not authenticated" });
        return undefined;
    }
    const user = await authStore.getPublicUser(sessionEmail);
    if (!user || !user.active) {
        req.session.userEmail = undefined;
        res.status(401).json({ message: "Not authenticated" });
        return undefined;
    }
    req.authUser = user;
    return user;
}
export async function registerRoutes(app, authStore) {
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    const pythonBackendBase = process.env.PYTHON_BACKEND_URL ?? `http://127.0.0.1:${process.env.PYTHON_PORT ?? '8081'}`;
    const pythonProcessUrl = new URL("/process-agent-data", pythonBackendBase).toString();
    const upload = multer();
    const requireAuth = async (req, res, next) => {
        try {
            const user = await authenticateRequest(req, res, authStore);
            if (!user) {
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
    const requireAdmin = async (req, res, next) => {
        try {
            const user = await authenticateRequest(req, res, authStore);
            if (!user) {
                return;
            }
            if (!user.isAdmin) {
                res.status(403).json({ message: "Administrator access required" });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
    app.post("/api/auth/signup", async (req, res) => {
        const { email, password } = req.body ?? {};
        if (!validateEmail(email) || !validatePassword(password)) {
            res.status(400).json({ message: "Email and a password with at least 6 characters are required." });
            return;
        }
        try {
            const user = await authStore.signUp(email, password);
            req.session.userEmail = user.email;
            const featureVisibility = await authStore.getFeatureVisibility();
            res.json({ user, featureVisibility });
        }
        catch (error) {
            if (isAuthStoreError(error)) {
                const mapped = mapAuthError(error);
                res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
                return;
            }
            console.error("Signup error", error);
            res.status(500).json({ message: "Failed to create account" });
        }
    });
    app.post("/api/auth/login", async (req, res) => {
        const { email, password } = req.body ?? {};
        if (!validateEmail(email) || typeof password !== "string") {
            res.status(400).json({ message: "Email and password are required." });
            return;
        }
        try {
            const result = await authStore.authenticate(email, password);
            if (result.success) {
                req.session.userEmail = result.user.email;
                const featureVisibility = await authStore.getFeatureVisibility();
                res.json({ user: result.user, featureVisibility });
                return;
            }
            const failure = result;
            const mapped = mapAuthError(new AuthStoreError(failure.code, "Authentication failed"));
            res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
            return;
        }
        catch (error) {
            if (isAuthStoreError(error)) {
                const mapped = mapAuthError(error);
                res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
                return;
            }
            console.error("Login error", error);
            res.status(500).json({ message: "Failed to sign in" });
        }
    });
    app.post("/api/auth/logout", (req, res) => {
        req.session.userEmail = undefined;
        req.session.destroy((destroyError) => {
            if (destroyError) {
                console.error("Logout error", destroyError);
                res.status(500).json({ message: "Failed to log out" });
                return;
            }
            res.json({ success: true });
        });
    });
    app.get("/api/auth/user", async (req, res) => {
        try {
            const user = await authenticateRequest(req, res, authStore);
            if (!user) {
                return;
            }
            const featureVisibility = await authStore.getFeatureVisibility();
            res.json({ user, featureVisibility });
        }
        catch (error) {
            console.error("Current user error", error);
            res.status(500).json({ message: "Failed to fetch user" });
        }
    });
    app.get("/api/admin/users", requireAdmin, async (_req, res) => {
        try {
            const users = await authStore.listUsers();
            res.json({ users });
        }
        catch (error) {
            console.error("List users error", error);
            res.status(500).json({ message: "Failed to load users" });
        }
    });
    app.patch("/api/admin/users/:email", requireAdmin, async (req, res) => {
        const targetEmail = req.params.email;
        const { password, active } = req.body ?? {};
        const actingUser = req.authUser;
        if (!actingUser) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        if (typeof active === "boolean" && !active && targetEmail.toLowerCase() === actingUser.email.toLowerCase()) {
            res.status(400).json({ message: "Administrators cannot disable their own account." });
            return;
        }
        try {
            let updatedUser;
            if (typeof password === "string" && password.length > 0) {
                updatedUser = await authStore.resetPassword(targetEmail, password);
            }
            if (typeof active === "boolean") {
                updatedUser = await authStore.setAccess(targetEmail, active);
            }
            const responseUser = updatedUser ?? (await authStore.getPublicUser(targetEmail));
            res.json({ user: responseUser });
        }
        catch (error) {
            if (isAuthStoreError(error)) {
                const mapped = mapAuthError(error);
                res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
                return;
            }
            console.error("Update user error", error);
            res.status(500).json({ message: "Failed to update user" });
        }
    });
    app.get("/api/admin/features", requireAdmin, async (_req, res) => {
        try {
            const featureVisibility = await authStore.getFeatureVisibility();
            res.json({ featureVisibility });
        }
        catch (error) {
            console.error("Get features error", error);
            res.status(500).json({ message: "Failed to fetch feature visibility" });
        }
    });
    app.patch("/api/admin/features", requireAdmin, async (req, res) => {
        const { featureVisibility } = req.body ?? {};
        if (typeof featureVisibility !== "object" || featureVisibility === null) {
            res.status(400).json({ message: "A featureVisibility object is required." });
            return;
        }
        try {
            const updated = await authStore.updateFeatureVisibility(featureVisibility);
            res.json({ featureVisibility: updated });
        }
        catch (error) {
            console.error("Update features error", error);
            res.status(500).json({ message: "Failed to update feature visibility" });
        }
    });
    app.post("/api/process-agent-data", requireAuth, upload.any(), async (req, res) => {
        try {
            console.log("Received file upload request, proxying to Flask backend...");
            console.log("Files received:", Array.isArray(req.files) ? req.files.length : 0);
            const formData = new FormData();
            const files = Array.isArray(req.files) ? req.files : [];
            files.forEach((file) => {
                console.log(`Adding file: ${file.fieldname} -> ${file.originalname}`);
                formData.append(file.fieldname, file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                });
            });
            if (req.authUser) {
                formData.append("user_email", req.authUser.email);
            }
            const fetch = (await import("node-fetch")).default;
            const response = await fetch(pythonProcessUrl, {
                method: "POST",
                body: formData,
                headers: formData.getHeaders(),
            });
            console.log("Flask backend response status:", response.status);
            if (!response.ok) {
                console.error("Flask backend error:", response.status, response.statusText);
                const errorText = await response.text();
                console.error("Flask error details:", errorText);
                return res.status(response.status).json({
                    error: `Backend service error: ${response.statusText}`,
                    details: errorText,
                });
            }
            const data = await response.json();
            console.log("Successfully proxied request to Flask backend");
            res.json(data);
        }
        catch (error) {
            console.error("Error proxying to Python backend:", error);
            res.status(500).json({
                error: "Data processing service unavailable",
                details: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use(express.static(path.join(__dirname, "../dist")));
    const httpServer = createServer(app);
    return httpServer;
}
