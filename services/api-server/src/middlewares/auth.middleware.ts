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
) => {
  try {
    const token = req.cookies.token || req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "You must be logged in to access this feature. Please log in to your account.",
      });
    }

    try {
      const decoded = jwt.verify(
        token.replace("Bearer ", ""),
        process.env.JWT_SECRET!
      ) as UserPayload;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has expired or the token is invalid. Please log in again to continue.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "We encountered an unexpected error while verifying your session. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
