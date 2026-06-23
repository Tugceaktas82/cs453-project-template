import express from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import taskRoutes from "./routes/taskRoutes";
import { Server } from "node:http";

const app = express();

app.use(express.json());

// Şablonun varsayılan sağlık kontrol rotaları
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

// Yeni refaktör edilmiş Task rotalarımızı Express'e bağlıyoruz
app.use("/tasks", taskRoutes);

// Tanımlanmamış rotalar için catch-all 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`);
});

export default app;