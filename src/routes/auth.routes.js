import express from "express";
import {
  googleAuth,
  googleCallback,
  logout,
  getMe
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", protect, getMe);
router.post("/logout", logout);

export default router;