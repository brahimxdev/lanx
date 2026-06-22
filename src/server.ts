import { appConfig } from "./config/index.js";
import app from "./app.js";

app.listen(appConfig.port, () => {
  console.log(`Server running on ${appConfig.url}:${String(appConfig.port)}`);
});
