import { pool } from "../db/pool";

export const projectService = {
    async getAllProjects(userId: number) {
        const result = await pool.query(
            `SELECT p.id, p.name, p.owner_id AS "ownerId", p.created_at AS "createdAt"
             FROM projects p
             LEFT JOIN project_members pm ON pm.project_id = p.id
             WHERE p.owner_id = $1 OR pm.user_id = $1
             GROUP BY p.id
             ORDER BY p.id ASC`,
            [userId]
        );
        return result.rows;
    },

    async getProjectById(id: number, userId: number) {
        const result = await pool.query(
            `SELECT p.id, p.name, p.owner_id AS "ownerId", p.created_at AS "createdAt"
             FROM projects p
             LEFT JOIN project_members pm ON pm.project_id = p.id
             WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
            [id, userId]
        );
        return result.rows[0] || null;
    },

    async createProject(name: string, ownerId: number) {
        const result = await pool.query(
            `INSERT INTO projects (name, owner_id)
             VALUES ($1, $2)
             RETURNING id, name, owner_id AS "ownerId", created_at AS "createdAt"`,
            [name, ownerId]
        );
        return result.rows[0];
    },

    async updateProject(id: number, name: string, userId: number) {
        const result = await pool.query(
            `UPDATE projects
             SET name = $1
             WHERE id = $2 AND owner_id = $3
             RETURNING id, name, owner_id AS "ownerId", created_at AS "createdAt"`,
            [name, id, userId]
        );
        return result.rows[0] || null;
    },

    async deleteProject(id: number, userId: number) {
        const result = await pool.query(
            `DELETE FROM projects
             WHERE id = $1 AND owner_id = $2`,
            [id, userId]
        );
        return (result.rowCount ?? 0) > 0;
    },

    async addMember(projectId: number, userId: number, ownerId: number) {
        // Sadece proje sahibi üye ekleyebilir
        const project = await pool.query(
            "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
            [projectId, ownerId]
        );
        if (project.rows.length === 0) {
            throw new Error("NOT_OWNER");
        }

        await pool.query(
            `INSERT INTO project_members (project_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [projectId, userId]
        );
        return true;
    },
};