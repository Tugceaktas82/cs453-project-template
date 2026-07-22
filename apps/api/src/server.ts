import express from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import taskRoutes from "./routes/taskRoutes";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";

const app = express();
app.use(express.json());

// Health check routes
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "cs453-api",
    });
});

app.get("/db-health", async (_req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json({
            status: "ok",
            database: "connected",
            currentTime: result.rows[0].current_time,
        });
    } catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({
            status: "error",
            database: "disconnected",
        });
    }
});

// Mount routes
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);

// Catch-all 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Only start listening when run directly (not during tests)
if (require.main === module) {
    app.listen(env.port, () => {
        console.log(`Server running at http://localhost:${env.port}`);
    });
}

export default app;