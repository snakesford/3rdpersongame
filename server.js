const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const { attachRooms } = require("./rooms.cjs");

const HOST = "127.0.0.1";
const PORT = 4173;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME_TYPES[ext] || "application/octet-stream");
  });
}

function createGameServer(requestHandler = serveStatic) {
  const server = http.createServer(requestHandler);
  const io = new Server(server);
  attachRooms(io);

  io.on("connection", socket => {
    console.log(`[network] Connected: ${socket.id}`);
    socket.on("disconnect", reason => {
      console.log(`[network] Disconnected: ${socket.id} (${reason})`);
    });
  });

  return { server, io };
}

if (require.main === module) {
  const { server } = createGameServer();
  server.listen(PORT, HOST, () => {
    console.log(`Timberline Command server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { createGameServer };
