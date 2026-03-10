import dotenv from "dotenv";
dotenv.config();

import connectDB from "./src/config/db.js";
import app from "./src/app.js";

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default app;
