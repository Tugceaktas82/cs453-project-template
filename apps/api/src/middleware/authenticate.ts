import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthRequest extends Request {
    userId?: number;
    userRole?: string;
    userEmail?: string;
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    // Check if token exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, env.jwtSecret as string) as {
            userId: number;
            email: string;
            role: string;
        };
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        res.status(401).json({ error: "Authentication required" });
    }
};