import express from "express";
import {
  createComment,
  getComments
} from "../controllers/comment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:storyId", protect, createComment);
router.get("/:storyId", getComments);

export default router;