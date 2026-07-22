import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { projectService } from "../services/projectService";

const router = Router();

// Tüm route'lar authenticate middleware'i gerektirir
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    try {
        const project = await projectService.getProjectById(id, req.userId!);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
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
        return res.status(400).json({ error: "Project name is required" });
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "Project name is required" });
    }

    try {
        const project = await projectService.updateProject(id, name, req.userId!);
        if (!project) {
            return res.status(404).json({ error: "Project not found or not authorized" });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /projects/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    try {
        const deleted = await projectService.deleteProject(id, req.userId!);
        if (!deleted) {
            return res.status(404).json({ error: "Project not found or not authorized" });
        }
        res.json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /projects/:id/members
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    const { userId } = req.body;
    if (!userId || isNaN(parseInt(userId, 10))) {
        return res.status(400).json({ error: "Valid userId is required" });
    }

    try {
        await projectService.addMember(projectId, parseInt(userId, 10), req.userId!);
        res.status(201).json({ message: "Member added successfully" });
    } catch (error: any) {
        if (error.message === "NOT_OWNER") {
            return res.status(403).json({ error: "Only the project owner can add members" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;