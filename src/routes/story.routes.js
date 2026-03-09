import express from "express";
import {
  createStory,
  getStories,
  getStoryById,
  vote,
  getMyStories,
  updateStory,
  deleteStory,
  searchStories,
  getCompanyStories,
  getTrendingCompanies,
  getSitemapStories
} from "../controllers/story.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";



const router = express.Router();

// Important: specific/static routes first
router.get("/search", optionalAuth, searchStories);
router.get("/sitemap", getSitemapStories);
router.get("/trending-companies", getTrendingCompanies);
router.get("/company/:companyName", optionalAuth, getCompanyStories);
router.get("/me/mystories", protect, getMyStories);

router
  .route("/")
  .get(optionalAuth, getStories)
  .post(protect, createStory);

router.get("/:id", optionalAuth, getStoryById);
router.post("/:id/vote", protect, vote);

router.put("/:id", protect, updateStory);
router.delete("/:id", protect, deleteStory);
export default router;