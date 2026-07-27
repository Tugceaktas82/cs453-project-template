import { pool } from "../db/pool";

export const userService = {
    // Get all users (admin only)
    async getAllUsers() {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at AS "createdAt"
             FROM users
             ORDER BY id ASC`
        );
        return result.rows;
    },

    // Get one user by id
    async getUserById(id: number) {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at AS "createdAt"
             FROM users
             WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },
};