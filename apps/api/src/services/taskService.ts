import { pool } from '../db/pool';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const taskService = {
  async getAllTasks(): Promise<Task[]> {
    const result = await pool.query(
      `SELECT id, title, description, status, created_at AS "createdAt", updated_at AS "updatedAt" 
       FROM tasks ORDER BY id ASC`
    );
    return result.rows;
  },

  async getTaskById(id: number): Promise<Task | null> {
    const result = await pool.query(
      `SELECT id, title, description, status, created_at AS "createdAt", updated_at AS "updatedAt" 
       FROM tasks WHERE id = $1`, 
      [id]
    );
    return result.rows[0] || null;
  },

  async createTask(title: string, description?: string, status: string = 'todo'): Promise<Task> {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status) 
       VALUES ($1, $2, $3) 
       RETURNING id, title, description, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [title, description, status]
    );
    return result.rows[0];
  },

  async updateTask(id: number, updates: Partial<Pick<Task, 'title' | 'description' | 'status'>>): Promise<Task | null> {
    const { title, description, status } = updates;
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

    if (fields.length === 0) {
      return this.getTaskById(id);
    }

    values.push(id);
    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')} 
      WHERE id = $${queryIndex} 
      RETURNING id, title, description, status, created_at AS "createdAt", updated_at AS "updatedAt"`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async deleteTask(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};