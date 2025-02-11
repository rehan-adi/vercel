import bcrypt from "bcrypt";
import prisma from "database";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import type { Request, Response } from "express";
import { signupValidation, signinValidation } from "../validations/user";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const parsedData = signupValidation.parse(req.body);
  const { email, password, name } = parsedData;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: "Email is already in use." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      message: "User created successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  const parsedData = signinValidation.parse(req.body);
  const { email, password } = parsedData;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid password." });
      return;
    }

    const token = jwt.sign({ id: user.id }, config.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.cookie("token", token, {
      maxAge: 72 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).json({
      success: true,
      token,
      message: "Signin successful!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
