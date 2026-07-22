import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { env } from "../config/env";

const SALT_ROUNDS = 10;

export const authService = {
    async register(email: string, password: string) {
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0) {
            throw new Error("EMAIL_TAKEN");
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at AS "createdAt"`,
            [email, password_hash]
        );
        return result.rows[0];
    },

    async login(email: string, password: string) {
        const result = await pool.query(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            [email]
        );

        const user = result.rows[0];
        if (!user) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const token = jwt.sign(
            { userId: user.id },
            env.jwtSecret,
            { expiresIn: env.jwtExpiresIn }
        );

        return {
            token,
            user: { id: user.id, email: user.email },
        };
    },
};