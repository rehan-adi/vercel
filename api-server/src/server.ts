import cors from "cors";
import env from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";

env.config();

const server = express();

// Middleware
server.use(express.json());
server.use(cors());
server.use(helmet());
server.use(morgan("dev"));

// health check endpoint
server.get("/", (req, res) => {
  res.status(200).json("OK");
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
