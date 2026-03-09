import mongoose from "mongoose";

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "story";

const storySchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, unique: true, sparse: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    company: { type: String, required: true, trim: true, maxlength: 80, index: true },
    role: { type: String, required: true, trim: true, maxlength: 80, index: true },
    content: { type: String, required: true, trim: true, maxlength: 15000 },

    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Easy" },
    rounds: { type: Number, default: 1, min: 1, max: 20 },
    result: { type: String, enum: ["Selected", "Rejected", "Pending"], default: "Selected" },
    tips: { type: String, trim: true, maxlength: 5000, default: "" },
    anonymous: { type: Boolean, default: false },
    interviewDate: { type: Date, default: null },
    questionsAsked: { type: String, trim: true, maxlength: 5000, default: "" },
    overallExperience: { type: String, trim: true, maxlength: 2000, default: "" },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    rating: { type: Number, min: 1, max: 5, default: null },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    votes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        voteType: { type: String, enum: ["upvote", "downvote"], required: true }
      }
    ],

    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    totalUpvotes: { type: Number, default: 0, index: true },
    totalDownvotes: { type: Number, default: 0, index: true },
    upvoteCount: { type: Number, default: 0, index: true },
    commentCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

storySchema.pre("save", function (next) {
  if (this.isNew && !this.slug) {
    const base = slugify(`${this.company} ${this.role} ${this.title}`);
    const suffix = this._id ? this._id.toString().slice(-6) : Date.now().toString(36);
    this.slug = `${base}-${suffix}`;
  }
  next();
});

export default mongoose.model("Story", storySchema);