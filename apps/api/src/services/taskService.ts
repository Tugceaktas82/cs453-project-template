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

    //Get a task by id with no access filtering , used only to distinguish
    //"task does not exist" (404) from "task exists but you can't touch it" (403).
    async getTaskByIdAdmin(id: number): Promise<Task | null> {
        const result = await pool.query(
            `SELECT id, title, description, status,
                    project_id AS "projectId",
                    assigned_to AS "assignedTo",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
             FROM tasks
             WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    //A task's project (when given) must exist so tasks can't be silently attached to a project_id that doesn't exist.
    async projectExists(projectId: number): Promise<boolean> {
        const result = await pool.query(
            "SELECT id FROM projects WHERE id = $1",
            [projectId]
        );
        return result.rows.length > 0;
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

    //Update a task , only someone with access (project owner, project member,
    //the assignee, or an admin) can modify it. Returns null if the caller is
    //not permitted to update this task (caller should already have confirmed
    //the task exists via getTaskByIdAdmin, so null here means "forbidden").
    async updateTask(
        id: number,
        userId: number,
        userRole: string,
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
            return userRole === "admin"
                ? this.getTaskByIdAdmin(id)
                : this.getTaskById(id, userId);
        }

        values.push(id);
        const idIndex = queryIndex++;

        let accessClause = "";
        if (userRole !== "admin") {
            values.push(userId);
            const uidIndex = queryIndex++;
            accessClause = `
              AND (t.project_id IS NULL
                   OR EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.owner_id = $${uidIndex})
                   OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${uidIndex})
                   OR t.assigned_to = $${uidIndex})`;
        }

        const query = `
            UPDATE tasks t
            SET ${fields.join(", ")}
            WHERE t.id = $${idIndex}
            ${accessClause}
            RETURNING t.id, t.title, t.description, t.status,
                      t.project_id AS "projectId",
                      t.assigned_to AS "assignedTo",
                      t.created_at AS "createdAt",
                      t.updated_at AS "updatedAt"`;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    //Delete a task ; same access rule as updateTask. Returns false if the caller does not have access (caller should confirm existence separately
    //to distinguish 404 from 403).
    async deleteTask(id: number, userId: number, userRole: string): Promise<boolean> {
        if (userRole === "admin") {
            const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
            return (result.rowCount ?? 0) > 0;
        }

        const result = await pool.query(
            `DELETE FROM tasks t
             WHERE t.id = $1
               AND (t.project_id IS NULL
                    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.owner_id = $2)
                    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $2)
                    OR t.assigned_to = $2)`,
            [id, userId]
        );
        return (result.rowCount ?? 0) > 0;
    },
};