import { Router, Request, Response } from "express";
import { authService } from "../services/authService";

const router = Router();

// POST /auth/register
router.post("/register", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
        const user = await authService.register(email, password);
        res.status(201).json(user);
    } catch (error: any) {
        if (error.message === "EMAIL_TAKEN") {
            return res.status(409).json({ error: "Email already in use" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const result = await authService.login(email, password);
        res.json(result);
    } catch (error: any) {
        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;