import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { taskService } from "../services/taskService";

const router = Router();

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

    if (projectId === undefined || projectId === null || isNaN(parseInt(projectId, 10))) {
        return res.status(400).json({ error: "A valid projectId is required" });
    }

    try {
        const projectIdNum = parseInt(projectId, 10);
        const projectOk = await taskService.projectExists(projectIdNum);
        if (!projectOk) {
            return res.status(400).json({ error: "projectId does not refer to an existing project" });
        }

        const newTask = await taskService.createTask(
            title,
            req.userId!,
            description,
            status,
            projectIdNum,
            assignedTo
        );
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /tasks/:id ; only someone with access (project owner, project
// member, the assignee, or an admin) can update a task
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
        // Distinguish "does not exist" (404) from "exists but not allowed" (403)
        const existing = await taskService.getTaskByIdAdmin(id);
        if (!existing) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (projectId !== undefined && projectId !== null) {
            const projectOk = await taskService.projectExists(projectId);
            if (!projectOk) {
                return res.status(400).json({ error: "projectId does not refer to an existing project" });
            }
        }

        const updatedTask = await taskService.updateTask(id, req.userId!, req.userRole!, {
            title,
            description,
            status,
            projectId,
            assignedTo,
        });
        if (!updatedTask) {
            return res.status(403).json({ error: "You do not have permission to modify this task" });
        }
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /tasks/:id ; only someone with access (project owner, project
// member, the assignee, or an admin) can delete a task
router.delete("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID format" });
    }
    try {
        // Distinguish "does not exist" (404) from "exists but not allowed" (403)
        const existing = await taskService.getTaskByIdAdmin(id);
        if (!existing) {
            return res.status(404).json({ error: "Task not found" });
        }

        const deleted = await taskService.deleteTask(id, req.userId!, req.userRole!);
        if (!deleted) {
            return res.status(403).json({ error: "You do not have permission to delete this task" });
        }
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;