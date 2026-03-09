import User from "../models/User.js";
import { asyncHandler } from "../middleware/async.middleware.js";

export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const users = await User.find({ reputationPoints: { $gt: 0 } })
    .select("name avatar reputationPoints")
    .sort({ reputationPoints: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    leaderboard: users.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      avatar: u.avatar,
      reputationPoints: u.reputationPoints || 0
    }))
  });
});
