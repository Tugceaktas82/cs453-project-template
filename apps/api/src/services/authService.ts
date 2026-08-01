import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { env } from "../config/env";

const SALT_ROUNDS = 10;

export const authService = {
    //Register a new user
    async register(name: string, email: string, password: string) {
        //Check if email is already taken
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0) {
            throw new Error("EMAIL_TAKEN");
        }

        //Hash the password before saving
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        //Role is always "user" on register — client cannot set it
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'user')
             RETURNING id, name, email, role, created_at AS "createdAt"`,
            [name, email, password_hash]
        );
        return result.rows[0];
    },

    //Login and return a JWT
    async login(email: string, password: string) {
        const result = await pool.query(
            "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
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

        //Include userId, email, and role in the token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            env.jwtSecret as string,
            { expiresIn: "7d" }
        );

        return {
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
    },
};