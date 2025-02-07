import mongoose from "mongoose";
import { config } from "../config/config";

export const dbConnect = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      dbName: config.DB_NAME,
    });
    console.log("Database connected");
  } catch (error) {
    console.error(`DB Connection Failed`, error);
    process.exit(1);
  }
};
