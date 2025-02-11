import { config } from "../config/config";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

interface UserPayload extends JwtPayload {
  id: string;
  token: string;
}

declare global {
  namespace Express {
    interface User extends UserPayload {}
    interface Request {
      user?: UserPayload;
    }
  }
}

export const checkLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.token || req.headers.authorization;

    if (!token) {
      res.status(401).json({
        success: false,
        message:
          "You must be logged in to access this feature. Please log in to your account.",
      });
      return;
    }

    try {
      const decoded = jwt.verify(
        token.replace("Bearer ", ""),
        config.JWT_SECRET
      ) as UserPayload;
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message:
          "Your session has expired or the token is invalid. Please log in again to continue.",
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "We encountered an unexpected error while verifying your session. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
};
