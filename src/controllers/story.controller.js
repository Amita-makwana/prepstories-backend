import mongoose from "mongoose";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import { calculateTrendingScore } from "../utils/trendingScore.js";

const enrichStoryWithVotes = (story, userId) => {
  const s = story?.toObject ? story.toObject() : { ...(story || {}) };
  const votes = Array.isArray(s.votes) ? s.votes : [];
  const uid = userId?.toString?.() || (userId ? String(userId) : null);
  if (votes.length > 0) {
    s.totalUpvotes = votes.filter((v) => v?.voteType === "upvote").length;
    s.totalDownvotes = votes.filter((v) => v?.voteType === "downvote").length;
    const uv = votes.find((v) => v?.userId && (v.userId.toString?.() || String(v.userId)) === uid);
    s.userVote = uv ? uv.voteType : null;
  } else {
    const upvotes = Array.isArray(s.upvotes) ? s.upvotes : [];
    s.totalUpvotes = s.totalUpvotes ?? upvotes.length;
    s.totalDownvotes = s.totalDownvotes ?? 0;
    s.userVote = uid && upvotes.some((id) => (id?.toString?.() || String(id)) === uid) ? "upvote" : null;
  }
  s.upvoteCount = (s.totalUpvotes ?? 0) - (s.totalDownvotes ?? 0);
  return s;
};

const pickStoryFields = (body = {}) => {
  const allowed = [
    "title",
    "company",
    "role",
    "content",
    "difficulty",
    "rounds",
    "result",
    "tips",
    "anonymous",
    "interviewDate",
    "questionsAsked",
    "overallExperience",
    "tags",
    "rating"
  ];

  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
};


export const createStory = asyncHandler(async (req, res) => {
  const story = await Story.create({ ...pickStoryFields(req.body), author: req.user._id });
  await User.findByIdAndUpdate(req.user._id, { $inc: { reputationPoints: 10 } });

  res.status(201).json({
    success: true,
    story
  });
});

export const getStories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  const sortBy = req.query.sortBy || req.query.sort || "latest";
  const sortOption = (() => {
    if (sortBy === "likes" || sortBy === "upvotes") return { upvoteCount: -1 };
    if (sortBy === "oldest") return { createdAt: 1 };
    if (sortBy === "company") return { company: 1 };
    if (sortBy === "role") return { role: 1 };
    if (sortBy === "trending") return { trendingScore: -1 };
    return { createdAt: -1 };
  })();

  const filter = {};

  if (req.query.company) {
    filter.company = {
      $regex: req.query.company,
      $options: "i"
    };
  }
  if (req.query.role) {
    filter.role = { $regex: req.query.role, $options: "i" };
  }

  const total = await Story.countDocuments(filter);

  const storyDocs = await Story.find(filter)
    .populate("author", "name avatar")
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  const userId = req.user?._id?.toString();
  const stories = storyDocs.map((doc) => enrichStoryWithVotes(doc, userId));

  res.json({
    success: true,
    stories,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

const findStoryByIdOrSlug = async (idOrSlug) => {
  if (mongoose.Types.ObjectId.isValid(idOrSlug) && String(idOrSlug).length === 24) {
    const byId = await Story.findById(idOrSlug);
    if (byId) return byId;
  }
  return Story.findOne({ slug: idOrSlug });
};

export const getStoryById = asyncHandler(async (req, res) => {
  const doc = await findStoryByIdOrSlug(req.params.id);
  if (!doc) {
    return res.status(404).json({ message: "Story not found" });
  }
  await doc.populate("author", "name avatar");
  const story = enrichStoryWithVotes(doc, req.user?._id);
  res.json({ success: true, story });
});

/**
 * POST /api/stories/:id/vote
 * Body: { voteType: "upvote" | "downvote" }
 * Logic: add vote, toggle (remove) if same, or switch vote type.
 */
export const vote = asyncHandler(async (req, res) => {
  const storyDoc = await findStoryByIdOrSlug(req.params.id);
  if (!storyDoc) {
    return res.status(404).json({ message: "Story not found" });
  }
  const storyId = storyDoc._id;
  const userId = req.user._id;
  const voteType = req.body?.voteType;

  if (!["upvote", "downvote"].includes(voteType)) {
    return res.status(400).json({ message: "voteType must be 'upvote' or 'downvote'" });
  }

  const story = storyDoc.toObject ? storyDoc.toObject() : await Story.findById(storyId).lean();
  if (!story) {
    return res.status(404).json({ message: "Story not found" });
  }

  const votes = Array.isArray(story.votes) ? story.votes : [];
  const userIdStr = userId.toString();
  let existing = votes.find((v) =>
    v?.userId ? (typeof v.userId === "object" ? v.userId.toString() : String(v.userId)) === userIdStr : false
  );
  if (!existing && votes.length === 0) {
    const oldUpvotes = Array.isArray(story.upvotes) ? story.upvotes : [];
    const hadOldUpvote = oldUpvotes.some((id) => (id?.toString?.() || String(id)) === userIdStr);
    if (hadOldUpvote) existing = { voteType: "upvote" };
  }

  let newVotes;
  if (!existing) {
    newVotes = [...votes, { userId, voteType }];
  } else if (existing.voteType === voteType) {
    newVotes = votes.filter((v) =>
      v?.userId ? (typeof v.userId === "object" ? v.userId.toString() : String(v.userId)) !== userIdStr : true
    );
  } else {
    newVotes = votes.map((v) =>
      v?.userId && (typeof v.userId === "object" ? v.userId.toString() : String(v.userId)) === userIdStr
        ? { ...v, voteType }
        : v
    );
  }

  const totalUpvotes = newVotes.filter((v) => v?.voteType === "upvote").length;
  const totalDownvotes = newVotes.filter((v) => v?.voteType === "downvote").length;
  const netVotes = totalUpvotes - totalDownvotes;
  const trendingScore = calculateTrendingScore(Math.max(0, netVotes), story.createdAt || new Date());
  const userVote = newVotes.find((v) =>
    v?.userId && (typeof v.userId === "object" ? v.userId.toString() : String(v.userId)) === userIdStr
  )
    ? newVotes.find((v) =>
        v?.userId && (typeof v.userId === "object" ? v.userId.toString() : String(v.userId)) === userIdStr
      ).voteType
    : null;

  const reputationDelta = !existing
    ? voteType === "upvote"
      ? 2
      : -1
    : existing.voteType === voteType
      ? voteType === "upvote"
        ? -2
        : 1
      : voteType === "upvote"
        ? 3
        : -3;

  const authorId = story.author;
  if (authorId) {
    await User.findByIdAndUpdate(authorId, { $inc: { reputationPoints: reputationDelta } });
  }

  const update = {
    $set: {
      votes: newVotes,
      totalUpvotes,
      totalDownvotes,
      upvoteCount: netVotes,
      trendingScore
    }
  };
  const upvotes = Array.isArray(story.upvotes) ? story.upvotes : [];
  if (upvotes.length > 0) {
    update.$pull = { upvotes: userId };
  }
  await Story.findByIdAndUpdate(storyId, update);

  res.json({
    success: true,
    totalUpvotes,
    totalDownvotes,
    userVote
  });
});

export const getMyStories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;

  const filter = { author: req.user._id, anonymous: { $ne: true } };
  const total = await Story.countDocuments(filter);

  const storyDocs = await Story.find(filter)
    .populate("author", "name avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const userId = req.user?._id?.toString();
  const stories = storyDocs.map((doc) => enrichStoryWithVotes(doc, userId));

  res.json({
    success: true,
    stories,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});


export const updateStory = asyncHandler(async (req, res) => {
  const story = await findStoryByIdOrSlug(req.params.id);

  if (!story) {
    return res.status(404).json({ message: "Story not found" });
  }

  if (!story.author.equals(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const updated = await Story.findByIdAndUpdate(
    story._id,
    pickStoryFields(req.body),
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    story: updated
  });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const story = await findStoryByIdOrSlug(req.params.id);

  if (!story) {
    return res.status(404).json({ message: "Story not found" });
  }

  if (!story.author.equals(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await Story.findByIdAndDelete(story._id);

  res.json({
    success: true,
    message: "Story deleted"
  });
});



/**
 * Google-like search across company, role, title, content, tips.
 * Supports: partial matches, multi-word queries, case-insensitive.
 * Query param: q (single query string)
 * Legacy: company, role (still supported for backward compatibility)
 */
export const searchStories = asyncHandler(async (req, res) => {
  const { q, company, role } = req.query;
  const filter = {};

  if (q && String(q).trim()) {
    const query = String(q).trim();
    const terms = query.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (terms.length > 0) {
      const orConditions = [];

      for (const term of terms) {
        const regex = { $regex: term, $options: "i" };
        orConditions.push(
          { company: regex },
          { role: regex },
          { title: regex },
          { content: regex },
          { tips: regex }
        );
      }

      filter.$and = terms.map((term) => {
        const regex = { $regex: term, $options: "i" };
        return {
          $or: [
            { company: regex },
            { role: regex },
            { title: regex },
            { content: regex },
            { tips: regex },
            { tags: regex }
          ]
        };
      });
    }
  } else {
    if (company) filter.company = { $regex: company, $options: "i" };
    if (role) filter.role = { $regex: role, $options: "i" };
  }

  const sortBy = req.query.sortBy || req.query.sort || "latest";
  const sortOption = (() => {
    if (sortBy === "likes" || sortBy === "upvotes") return { upvoteCount: -1 };
    if (sortBy === "oldest") return { createdAt: 1 };
    if (sortBy === "company") return { company: 1 };
    if (sortBy === "role") return { role: 1 };
    return { createdAt: -1 };
  })();

  const [docs, total] = await Promise.all([
    Story.find(filter)
      .populate("author", "name avatar")
      .sort(sortOption)
      .limit(100),
    Story.countDocuments(filter)
  ]);

  const userId = req.user?._id?.toString();
  const stories = docs.map((doc) => enrichStoryWithVotes(doc, userId));

  res.json({ success: true, stories, total });
});



/**
 * Parse questions from free-text (questionsAsked field).
 * Splits by newlines, numbers (1. 2. 3.), bullets (-, •, *)
 */
const parseQuestions = (text) => {
  if (!text || typeof text !== "string") return [];
  const normalized = text
    .split(/[\n\r]+/)
    .flatMap((line) => line.split(/[•\*\-]\s*/))
    .map((q) => q.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((q) => q.length > 5 && q.length < 200);
  return normalized;
};

/**
 * GET /stories/company/:companyName
 * Returns stories, total, difficulty stats, top questions for a company.
 */
export const getCompanyStories = asyncHandler(async (req, res) => {
  const companyName = decodeURIComponent(req.params.companyName).trim();
  if (!companyName) {
    return res.status(400).json({ message: "Company name is required" });
  }

  const filter = { company: { $regex: `^${companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } };

  if (req.query.role) {
    filter.role = { $regex: req.query.role, $options: "i" };
  }
  if (req.query.difficulty) {
    filter.difficulty = req.query.difficulty;
  }

  const sortBy = req.query.sortBy || "latest";
  const sortOption = sortBy === "likes" ? { upvoteCount: -1 } : { createdAt: -1 };
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const skip = (page - 1) * limit;

  const [stories, total, difficultyStats, allQuestions] = await Promise.all([
    Story.find(filter)
      .populate("author", "name avatar")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Story.countDocuments(filter),
    Story.aggregate([
      { $match: filter },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } }
    ]),
    Story.find(filter, "questionsAsked").lean()
  ]);

  const userId = req.user?._id?.toString();
  const storiesWithUpvote = stories.map((s) => enrichStoryWithVotes(s, userId));

  const totalDiff = difficultyStats.reduce((sum, d) => sum + d.count, 0);
  const difficultyPercent = totalDiff > 0
    ? Object.fromEntries(
        difficultyStats.map((d) => [
          d._id,
          Math.round((d.count / totalDiff) * 100)
        ])
      )
    : { Easy: 0, Medium: 0, Hard: 0 };

  const questionCounts = {};
  for (const doc of allQuestions) {
    const qs = parseQuestions(doc.questionsAsked);
    for (const q of qs) {
      const key = q.toLowerCase().slice(0, 150);
      questionCounts[key] = (questionCounts[key] || 0) + 1;
    }
  }
  const topQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([text, count]) => ({ text, count }));

  const displayCompany = stories.length > 0 ? stories[0].company : companyName;

  res.json({
    success: true,
    company: displayCompany,
    stories: storiesWithUpvote,
    total,
    pagination: { page, limit, pages: Math.ceil(total / limit) },
    difficultyPercent: {
      Easy: difficultyPercent.Easy ?? 0,
      Medium: difficultyPercent.Medium ?? 0,
      Hard: difficultyPercent.Hard ?? 0
    },
    topQuestions
  });
});

/**
 * GET /stories/trending-companies
 * Returns top companies by story count and total upvotes.
 */
/**
 * GET /api/stories/sitemap
 * Returns XML sitemap of all story URLs for SEO.
 */
export const getSitemapStories = asyncHandler(async (req, res) => {
  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://prepstories.com";
  const docs = await Story.find({}, { slug: 1, _id: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(5000)
    .lean();

  const urls = docs.map((d) => {
    const path = d.slug ? `/story/${d.slug}` : `/story/${d._id}`;
    const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : null;
    return `  <url>
    <loc>${baseUrl}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join("\n");

  res.set("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

export const getTrendingCompanies = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 8, 20);
  const agg = await Story.aggregate([
    { $group: {
      _id: "$company",
      storyCount: { $sum: 1 },
      totalUpvotes: { $sum: "$upvoteCount" }
    }},
    { $addFields: { score: { $add: ["$storyCount", { $multiply: ["$totalUpvotes", 0.5] }] } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $project: { company: "$_id", storyCount: 1, totalUpvotes: 1 } }
  ]);
  res.json({ success: true, companies: agg });
});