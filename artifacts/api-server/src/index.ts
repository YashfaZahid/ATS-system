import "./load-env";
import app from "./app";
import { logger } from "./lib/logger";
import { warmupEmbeddingModel } from "./lib/embeddings";

const rawPort = process.env["PORT"] ?? "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  warmupEmbeddingModel()
    .then(() => logger.info("Embedding model ready"))
    .catch((err) => logger.warn({ err }, "Embedding model warmup failed — will retry on first use"));
});
