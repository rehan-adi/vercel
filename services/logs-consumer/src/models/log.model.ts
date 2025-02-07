import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    logs: [{ type: String, require: true }],
    projectName: { type: String, index: true },
    createdAt: { type: Date, default: Date.now(), expires: 60 },
  },
  { timestamps: true }
);

export const LogModel = mongoose.model("Log", LogSchema);
