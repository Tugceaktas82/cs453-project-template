import { Router, Request, Response } from 'express';
import { taskService } from '../services/taskService';

const router = Router();

// GET /tasks - return every task in the db
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tasks = await taskService.getAllTasks();
    res.json(tasks); // defaults to 200 OK
  } catch (error) {
    // something went wrong on our end (db down, etc)
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /tasks/:id - return a single task
router.get('/:id', async (req: Request, res: Response) => {
  // params always come in as strings, so convert to number first
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    // someone passed something like /tasks/abc
    return res.status(400).json({ error: 'Invalid task ID format' });
  }
  try {
    const task = await taskService.getTaskById(id);
    if (!task) {
      // valid number, but no task with that id
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks - create a new task
router.post('/', async (req: Request, res: Response) => {
  const { title, description, status } = req.body;
  // title is required, must be a real non-empty string
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const newTask = await taskService.createTask(title, description, status);
    res.status(201).json(newTask); // 201 = resource created
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /tasks/:id - partial update, only sent fields get changed
router.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID format' });
  }
  const { title, description, status } = req.body;
  // title is optional here (unlike POST), but if it IS sent, it can't be empty
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  try {
    const updatedTask = await taskService.updateTask(id, { title, description, status });
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /tasks/:id - remove a task
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID format' });
  }
  try {
    const deleted = await taskService.deleteTask(id);
    if (!deleted) {
      // nothing got deleted, means id didn't exist
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;