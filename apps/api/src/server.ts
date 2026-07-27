import express from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import projectRoutes from "./routes/projectRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
app.use(express.json());

// Health check routes
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cs453-api" });
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
        res.status(500).json({ status: "error", database: "disconnected" });
    }
});

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Only start the server when running directly, not during tests
if (require.main === module) {
    app.listen(env.port, () => {
        console.log(`Server running at http://localhost:${env.port}`);
    });
}

export default app; 