import { createServer } from "node:http";

const { default: next } = await import("next");

const hostname = "127.0.0.1";
const port = 3000;
const app = next({ dev: false, dir: process.cwd(), hostname, port });
const handle = app.getRequestHandler();

await app.prepare();
const server = createServer((request, response) => handle(request, response));
server.listen(port, hostname);

async function shutdown() {
  server.close(async () => {
    await app.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2_000).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
