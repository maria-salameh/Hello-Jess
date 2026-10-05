import { connectDB } from "../config/db.js";
import { config } from "../config/env.js";
import app from "./app.js";

try {
  await connectDB();
} catch (err) {
  console.error(`Could not connect to MongoDB at ${config.mongodbUri}\n${err.message}`);
  process.exit(1);
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`HelloJess API listening on http://0.0.0.0:${config.port}`);
});
