import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for faster nested queries
commentSchema.index({ story: 1, parent: 1 });

export default mongoose.model("Comment", commentSchema);