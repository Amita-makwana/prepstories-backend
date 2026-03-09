import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  googleId: String,
  avatar: String,
  reputationPoints: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", userSchema);