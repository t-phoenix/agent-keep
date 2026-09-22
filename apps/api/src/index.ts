import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

const config = loadConfig();
const { app } = createApp({ config });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`AgentKeep API listening on http://localhost:${info.port}`);
  console.log(`payment adapter=${config.payment.adapter} mode=${config.payment.mode}`);
});
