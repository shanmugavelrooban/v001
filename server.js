/**
 * Zero-dependency local HTTP server + CORS-free Apps Script Proxy for Blooms & Flame Wax
 * Run with: node server.js
 */
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon"
};

/** Follows Google Apps Script 302 redirects server-side (zero browser CORS limits) */
function forwardToAppsScript(targetUrl, bodyStr, redirectsLeft, cb) {
  if (redirectsLeft <= 0) return cb(new Error("Too many redirects"));
  let parsed;
  try { parsed = new URL(targetUrl); } catch (e) { return cb(e); }

  const isPost = bodyStr !== null;
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: isPost ? "POST" : "GET",
    headers: isPost
      ? { "Content-Type": "text/plain;charset=utf-8", "Content-Length": Buffer.byteLength(bodyStr) }
      : {}
  };

  const req = https.request(options, (res) => {
    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      res.resume();
      // Apps Script 302 redirect after POST is always followed with GET to script.googleusercontent.com
      const nextBody = (res.statusCode === 307 || res.statusCode === 308) ? bodyStr : null;
      return forwardToAppsScript(res.headers.location, nextBody, redirectsLeft - 1, cb);
    }
    let data = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => cb(null, res.statusCode, data));
  });
  req.on("error", cb);
  if (isPost) req.write(bodyStr);
  req.end();
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  // Built-in same-origin proxy for Google Apps Script (bypasses browser CORS completely)
  if (req.method === "POST" && urlPath === "/api/apps-script") {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c) => { if (raw.length < 100000) raw += c; });
    req.on("end", () => {
      try {
        const { targetUrl, payload } = JSON.parse(raw);
        if (!/^https:\/\/script\.google\.com\//.test(targetUrl || "")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Invalid Apps Script URL" }));
        }
        forwardToAppsScript(targetUrl, JSON.stringify(payload || {}), 5, (err, status, body) => {
          if (err) {
            res.writeHead(502, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: false, error: err.message }));
          }
          try {
            const parsedJson = JSON.parse(body);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(parsedJson));
          } catch (parseErr) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              ok: false,
              error: "Apps Script returned HTML instead of JSON. Check that 'Who has access' is set to 'Anyone' in Deploy -> Manage deployments."
            }));
          }
        });
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Bad proxy request" }));
      }
    });
    return;
  }

  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(ROOT, rel));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => {
  console.log(`Blooms & Flame Wax running at http://localhost:${PORT}`);
});
