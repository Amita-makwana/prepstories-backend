import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import xss from "xss-clean";
import passport from "passport";

import "./config/passport.js";
import corsOptions from "./config/corsOptions.js";

import authRoutes from "./routes/auth.routes.js";
import storyRoutes from "./routes/story.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(xss());
app.use(passport.initialize());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

export default app;
