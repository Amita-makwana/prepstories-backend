import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import Story from "../models/Story.js";

export const createComment = asyncHandler(async (req, res) => {
  const comment = await Comment.create({
    story: req.params.storyId,
    author: req.user._id,
    parent: req.body.parent || null,
    content: req.body.content
  });

  await Story.findByIdAndUpdate(req.params.storyId, {
    $inc: { commentCount: 1 }
  });
  await User.findByIdAndUpdate(req.user._id, { $inc: { reputationPoints: 3 } });

  res.status(201).json({
    success: true,
    comment
  });
});

export const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({
    story: req.params.storyId,
    isDeleted: false
  })
    .populate("author", "name avatar")
    .lean();

  const commentMap = {};
  const roots = [];

  comments.forEach(comment => {
    comment.replies = [];
    commentMap[comment._id] = comment;
  });

  comments.forEach(comment => {
    if (comment.parent) {
      commentMap[comment.parent]?.replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  res.json({
    success: true,
    comments: roots
  });
});