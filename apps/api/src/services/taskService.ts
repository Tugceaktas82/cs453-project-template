import { pool } from "../db/pool";

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    projectId?: number;
    assignedTo?: number;
    createdAt: Date;
    updatedAt: Date;
}

export const taskService = {
    async getAllTasks(userId: number): Promise<Task[]> {
        const result = await pool.query(
            `SELECT t.id, t.title, t.description, t.status,
                    t.project_id AS "projectId",
                    t.assigned_to AS "assignedTo",
                    t.created_at AS "createdAt",
                    t.updated_at AS "updatedAt"
             FROM tasks t
             LEFT JOIN projects p ON p.id = t.project_id
             LEFT JOIN project_members pm ON pm.project_id = t.project_id
             WHERE t.project_id IS NULL
                OR p.owner_id = $1
                OR pm.user_id = $1
                OR t.assigned_to = $1
             GROUP BY t.id
             ORDER BY t.id ASC`,
            [userId]
        );
        return result.rows;
    },

    async getTaskById(id: number, userId: number): Promise<Task | null> {
        const result = await pool.query(
            `SELECT t.id, t.title, t.description, t.status,
                    t.project_id AS "projectId",
                    t.assigned_to AS "assignedTo",
                    t.created_at AS "createdAt",
                    t.updated_at AS "updatedAt"
             FROM tasks t
             LEFT JOIN projects p ON p.id = t.project_id
             LEFT JOIN project_members pm ON pm.project_id = t.project_id
             WHERE t.id = $1
               AND (t.project_id IS NULL
                    OR p.owner_id = $2
                    OR pm.user_id = $2
                    OR t.assigned_to = $2)`,
            [id, userId]
        );
        return result.rows[0] || null;
    },

    async createTask(
        title: string,
        userId: number,
        description?: string,
        status: string = "todo",
        projectId?: number,
        assignedTo?: number
    ): Promise<Task> {
        const result = await pool.query(
            `INSERT INTO tasks (title, description, status, project_id, assigned_to)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, title, description, status,
                       project_id AS "projectId",
                       assigned_to AS "assignedTo",
                       created_at AS "createdAt",
                       updated_at AS "updatedAt"`,
            [title, description, status, projectId || null, assignedTo || null]
        );
        return result.rows[0];
    },

    async updateTask(
        id: number,
        userId: number,
        updates: Partial<Pick<Task, "title" | "description" | "status" | "projectId" | "assignedTo">>
    ): Promise<Task | null> {
        const { title, description, status, projectId, assignedTo } = updates;
        const fields: string[] = [];
        const values: any[] = [];
        let queryIndex = 1;

        if (title !== undefined) {
            fields.push(`title = $${queryIndex++}`);
            values.push(title);
        }
        if (description !== undefined) {
            fields.push(`description = $${queryIndex++}`);
            values.push(description);
        }
        if (status !== undefined) {
            fields.push(`status = $${queryIndex++}`);
            values.push(status);
        }
        if (projectId !== undefined) {
            fields.push(`project_id = $${queryIndex++}`);
            values.push(projectId);
        }
        if (assignedTo !== undefined) {
            fields.push(`assigned_to = $${queryIndex++}`);
            values.push(assignedTo);
        }

        if (fields.length === 0) {
            return this.getTaskById(id, userId);
        }

        values.push(id);
        const query = `
            UPDATE tasks
            SET ${fields.join(", ")}
            WHERE id = $${queryIndex}
            RETURNING id, title, description, status,
                      project_id AS "projectId",
                      assigned_to AS "assignedTo",
                      created_at AS "createdAt",
                      updated_at AS "updatedAt"`;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    async deleteTask(id: number, userId: number): Promise<boolean> {
        const result = await pool.query(
            "DELETE FROM tasks WHERE id = $1",
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    },
};