import { Router } from "express";
import { getSystemStatus } from "../services/systemInfo.js";

const router = Router();

router.get("/status", async (_req, res, next) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
