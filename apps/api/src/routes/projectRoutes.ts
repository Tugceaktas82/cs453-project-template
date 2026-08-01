import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { projectService } from "../services/projectService";

const router = Router();

//All project routes require authentication
router.use(authenticate);

//GET /projects
router.get("/", async (req: AuthRequest, res: Response) => {
    try {
        const projects = await projectService.getAllProjects(req.userId!);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

//GET /projects/:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
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

//POST /projects
router.post("/", async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "Project name is required" });
    }

    try {
        const project = await projectService.createProject(
            name,
            description,
            req.userId!
        );
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

//PATCH /projects/:id — only owner or admin can update
router.patch("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "Project name is required" });
    }

    try {
        //Check if project exists at all (no membership filter)
        const existing = await projectService.getProjectByIdAdmin(id);
        if (!existing) {
            return res.status(404).json({ error: "Project not found" });
        }

        //Try to update — returns null if user is not owner and not admin
        const project = await projectService.updateProject(
            id,
            name,
            description,
            req.userId!,
            req.userRole!
        );
        if (!project) {
            return res.status(403).json({ error: "You do not have permission to modify this project" });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

//DELETE /projects/:id , only owner or admin can delete
router.delete("/:id", async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    try {
        //Check if project exists at all (no membership filter)
        const existing = await projectService.getProjectByIdAdmin(id);
        if (!existing) {
            return res.status(404).json({ error: "Project not found" });
        }

        //Try to delete , returns false if user is not owner and not admin
        const deleted = await projectService.deleteProject(
            id,
            req.userId!,
            req.userRole!
        );
        if (!deleted) {
            return res.status(403).json({ error: "You do not have permission to delete this project" });
        }
        res.json({ message: "Project deleted" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

//POST /projects/:id/members , only owner can add members
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
    }

    const { userId } = req.body;
    if (!userId || isNaN(parseInt(userId, 10))) {
        return res.status(400).json({ error: "Valid userId is required" });
    }

    try {
        await projectService.addMember(projectId, parseInt(userId, 10), req.userId!);
        res.status(201).json({ message: "Member added" });
    } catch (error: any) {
        if (error.message === "NOT_OWNER") {
            return res.status(403).json({ error: "Only the project owner can add members" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;