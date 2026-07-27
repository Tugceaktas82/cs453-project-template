import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticate";

// Middleware to check if the user has the required role
export const authorize = (requiredRole: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (req.userRole !== requiredRole) {
            res.status(403).json({ error: "You do not have permission to do this" });
            return;
        }
        next();
    };
};