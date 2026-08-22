const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const host = "127.0.0.1";
const port = 4173;
const root = path.resolve(__dirname, "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent(
    new URL(request.url, `http://${host}:${port}`).pathname,
  );
  const relativePath =
    requestPath === "/" ? "index.html" : requestPath.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
    response.writeHead(error.code === "ENOENT" ? 404 : 500).end();
  }
});

server.listen(port, host, () => {
  console.log(`PathPilot test server listening at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
