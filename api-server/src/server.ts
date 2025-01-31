import cors from "cors";
import env from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import { authRouter } from "./routes/auth";

env.config();

const server = express();

// Middleware
server.use(express.json());
server.use(cors());
server.use(helmet());
server.use(morgan("dev"));

// Routes
server.use("/api/v1/auth", authRouter);

// health check endpoint
server.get("/", (req, res) => {
  res.status(200).json("OK");
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
