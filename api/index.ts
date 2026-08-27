import { createRequire } from "node:module";
import type { Request, Response } from "express";

const require = createRequire(import.meta.url);
const loaded = require("../dist/server.cjs");
const app = loaded.default ?? loaded;

function serializeQuery(query: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const result = params.toString();
  return result ? `?${result}` : "";
}

export default function handler(req: Request, res: Response) {
  const { path, ...query } = req.query as Record<string, unknown>;
  const requestedPath = Array.isArray(path) ? path.join("/") : path;

  if (typeof requestedPath === "string" && requestedPath) {
    const normalizedPath = requestedPath
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..")
      .join("/");
    const target = `/api/${normalizedPath}${serializeQuery(query)}`;
    req.url = target;
    req.originalUrl = target;
  }

  return app(req, res);
}
