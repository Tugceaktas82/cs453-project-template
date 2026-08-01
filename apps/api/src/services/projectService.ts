import { pool } from "../db/pool";

export const projectService = {
    //Get all projects the user owns or is a member of
    async getAllProjects(userId: number) {
        const result = await pool.query(
            `SELECT p.id, p.name, p.description, p.owner_id AS "ownerId", p.created_at AS "createdAt"
             FROM projects p
             LEFT JOIN project_members pm ON pm.project_id = p.id
             WHERE p.owner_id = $1 OR pm.user_id = $1
             GROUP BY p.id
             ORDER BY p.id ASC`,
            [userId]
        );
        return result.rows;
    },

    //Get one project by id — user must be owner or member
    async getProjectById(id: number, userId: number) {
        const result = await pool.query(
            `SELECT p.id, p.name, p.description, p.owner_id AS "ownerId", p.created_at AS "createdAt"
             FROM projects p
             LEFT JOIN project_members pm ON pm.project_id = p.id
             WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
            [id, userId]
        );
        return result.rows[0] || null;
    },

    //Get project by id without membership check (used for 403 vs 404 distinction)
    async getProjectByIdAdmin(id: number) {
        const result = await pool.query(
            `SELECT id, name, description, owner_id AS "ownerId", created_at AS "createdAt"
             FROM projects
             WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    //Create a new project
    async createProject(name: string, description: string | undefined, ownerId: number) {
        const result = await pool.query(
            `INSERT INTO projects (name, description, owner_id)
             VALUES ($1, $2, $3)
             RETURNING id, name, description, owner_id AS "ownerId", created_at AS "createdAt"`,
            [name, description || null, ownerId]
        );
        return result.rows[0];
    },

    //Update a project — only owner or admin can do this
    async updateProject(id: number, name: string, description: string | undefined, userId: number, userRole: string) {
        const whereClause = userRole === "admin"
            ? "WHERE id = $3"
            : "WHERE id = $3 AND owner_id = $4";

        const values = userRole === "admin"
            ? [name, description || null, id]
            : [name, description || null, id, userId];

        const result = await pool.query(
            `UPDATE projects
             SET name = $1, description = $2
             ${whereClause}
             RETURNING id, name, description, owner_id AS "ownerId", created_at AS "createdAt"`,
            values
        );
        return result.rows[0] || null;
    },

    //Delete a project — only owner or admin can do this
    async deleteProject(id: number, userId: number, userRole: string) {
        const whereClause = userRole === "admin"
            ? "WHERE id = $1"
            : "WHERE id = $1 AND owner_id = $2";

        const values = userRole === "admin" ? [id] : [id, userId];

        const result = await pool.query(
            `DELETE FROM projects ${whereClause}`,
            values
        );
        return (result.rowCount ?? 0) > 0;
    },

    //Add a member to a project — only owner can do this
    async addMember(projectId: number, userId: number, ownerId: number) {
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