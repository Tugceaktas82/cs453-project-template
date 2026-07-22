import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { projectService } from "../services/projectService";

const router = Router();

// all routes here need auth middleware
router.use(authenticate);

// GET /projects
router.get("/", async (req: AuthRequest, res: Response) => {
    try {
        const projects = await projectService.getAllProjects(req.userId!);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /projects/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }

    try {
        const project = await projectService.getProjectById(id, req.userId!);
        if (!project) {
            res.status(404).json({ error: "Project not found" });
            return;
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /projects
router.post("/", async (req: AuthRequest, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({ error: "Project name is required" });
        return;
    }

    try {
        const project = await projectService.createProject(name, req.userId!);
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /projects/:id
router.patch("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({ error: "Project name is required" });
        return;
    }

    try {
        const project = await projectService.updateProject(id, name, req.userId!);
        if (!project) {
            res.status(404).json({ error: "Project not found or not authorized" });
            return;
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /projects/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }

    try {
        const deleted = await projectService.deleteProject(id, req.userId!);
        if (!deleted) {
            res.status(404).json({ error: "Project not found or not authorized" });
            return;
        }
        res.json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /projects/:id/members
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.id as string, 10);
    if (isNaN(projectId)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }

    const { userId } = req.body;
    if (!userId || isNaN(parseInt(userId, 10))) {
        res.status(400).json({ error: "Valid userId is required" });
        return;
    }

    try {
        await projectService.addMember(projectId, parseInt(userId, 10), req.userId!);
        res.status(201).json({ message: "Member added successfully" });
    } catch (error: any) {
        if (error.message === "NOT_OWNER") {
            res.status(403).json({ error: "Only the project owner can add members" });
            return;
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;