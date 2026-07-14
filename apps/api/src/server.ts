import express from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import taskRoutes from "./routes/taskRoutes";

const app = express();
app.use(express.json());

// Template default health check routes
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

// Mount our refactored Task routes onto Express
app.use("/tasks", taskRoutes);

// Catch-all 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Only start listening when this file is run directly (not when imported by tests)
if (require.main === module) {
    app.listen(env.port, () => {
        console.log(`Server running at http://localhost:${env.port}`);
    });
}

// Export the app instance so it can be used by automated tests (e.g. Supertest)
export default app;