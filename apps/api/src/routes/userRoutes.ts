import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { userService } from "../services/userService";

const router = Router();

// GET /users — admin only
router.get(
    "/",
    authenticate,
    authorize("admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// GET /users/:id — admin only
router.get(
    "/:id",
    authenticate,
    authorize("admin"),
    async (req: AuthRequest, res: Response) => {
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

export default router;