import cors from "cors";
import express from "express";
import { config } from "../config/env.js";
import authRouter from "../routes/authRoutes.js";
import taskRouter from "../routes/taskRoutes.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);

app.use((_req, res) => res.status(404).json({ detail: "Not Found" }));

app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ detail: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ detail: "Internal Server Error" });
});

export default app;
