import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../config/.env") });

export const env = {
    port: Number(process.env.PORT || 3000),
    databaseUrl:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/cs453",
    jwtSecret:
        process.env.JWT_SECRET || "dev-secret-change-in-production",
    jwtExpiresIn:
        process.env.JWT_EXPIRES_IN || "7d",
};