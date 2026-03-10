import dotenv from "dotenv";
dotenv.config();

import connectDB from "./src/config/db.js";
import app from "./src/app.js";

connectDB();

const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 PrepStories API running on port ${PORT}`);
// });

export default app;