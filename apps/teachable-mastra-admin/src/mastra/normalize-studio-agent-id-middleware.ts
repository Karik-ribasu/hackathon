import type { MiddlewareHandler } from "hono";

function stripRunScopedAgentId(value: string): string {
  const i = value.indexOf(":");
  return i === -1 ? value : value.slice(0, i);
}

/** WebSocket route `GET /browser/:agentId/stream` — `getToolset(agentId)` uses `Agent.id` without run suffix. */
function normalizeBrowserStreamPath(pathname: string): string | null {
  const m = /^(\/browser\/)([^/]+)(\/.*)?$/u.exec(pathname);
  if (!m) return null;
  const [, prefix, rawSeg, tail = ""] = m;
  let seg = rawSeg;
  try {
    seg = decodeURIComponent(rawSeg);
  } catch {
    /* keep rawSeg */
  }
  if (!seg.includes(":")) return null;
  const base = stripRunScopedAgentId(seg);
  return base === seg ? null : `${prefix}${base}${tail}`;
}

/**
 * Mastra Studio may send `agentId` as `<agent.id>:<run or session uuid>`.
 * `Mastra.getAgentById` matches `Agent.id` exactly, so compound ids break memory, agent routes, and
 * the browser viewer WebSocket (`getToolset` / ViewerRegistry).
 * Normalizes query, `/agents/:agentId`, and `/browser/:agentId` path segments to the base id.
 */
export const normalizeStudioAgentIdMiddleware: MiddlewareHandler = async (c, next) => {
  const current = new URL(c.req.url);
  const target = new URL(current.toString());
  let changed = false;

  const queryAgentId = target.searchParams.get("agentId");
  if (queryAgentId?.includes(":")) {
    target.searchParams.set("agentId", stripRunScopedAgentId(queryAgentId));
    changed = true;
  }

  const browserPath = normalizeBrowserStreamPath(target.pathname);
  if (browserPath) {
    target.pathname = browserPath;
    changed = true;
  }

  const parts = target.pathname.split("/");
  const agentsIdx = parts.indexOf("agents");
  if (agentsIdx !== -1) {
    const segment = parts[agentsIdx + 1];
    if (segment?.includes(":")) {
      parts[agentsIdx + 1] = stripRunScopedAgentId(segment);
      target.pathname = parts.join("/");
      changed = true;
    }
  }

  if (changed) {
    c.req.raw = new Request(target, c.req.raw);
  }

  await next();
};
