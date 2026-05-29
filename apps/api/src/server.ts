import { createApp } from "./app.js";
import { env, assertDatabaseUrl } from "./config/env.js";
import { expireStaleHolds } from "./services/inventory.service.js";

assertDatabaseUrl();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

setInterval(
  () => {
    expireStaleHolds().catch(console.error);
  },
  60 * 1000
);
