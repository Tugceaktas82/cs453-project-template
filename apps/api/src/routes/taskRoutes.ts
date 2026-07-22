import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { taskService } from "../services/taskService";

const router = Router();

// Tüm route'lar authenticate middleware'i gerektirir
router.use(authenticate);

// GET /tasks
router.get("/", async (req: AuthRequest, res: Response) => {
    try {
        const tasks = await taskService.getAllTasks(req.userId!);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// GET /tasks/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID format" });
    }
    try {
        const task = await taskService.getTaskById(id, req.userId!);
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /tasks
router.post("/", async (req: AuthRequest, res: Response) => {
    const { title, description, status, projectId, assignedTo } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ error: "Title is required" });
    }

    try {
        const newTask = await taskService.createTask(
            title,
            req.userId!,
            description,
            status,
            projectId,
            assignedTo
        );
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /tasks/:id
router.patch("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID format" });
    }

    const { title, description, status, projectId, assignedTo } = req.body;

    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
        return res.status(400).json({ error: "Title cannot be empty" });
    }

    try {
        const updatedTask = await taskService.updateTask(id, req.userId!, {
            title,
            description,
            status,
            projectId,
            assignedTo,
        });
        if (!updatedTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /tasks/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID format" });
    }
    try {
        const deleted = await taskService.deleteTask(id, req.userId!);
        if (!deleted) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;