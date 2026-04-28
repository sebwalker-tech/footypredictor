const ALLOWED_PATHS = new Set([
  "/competitions/ELC/matches",
  "/competitions/ELC/standings"
]);

export default async function handler(request, response) {
  const requestedPath = request.query.path;
  const path = Array.isArray(requestedPath) ? requestedPath[0] : requestedPath;

  if (!path || !ALLOWED_PATHS.has(path)) {
    response.status(400).json({ error: "Unsupported football-data path" });
    return;
  }

  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) {
    response.status(500).json({ error: "Missing FOOTBALL_DATA_API_KEY" });
    return;
  }

  const upstream = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { "X-Auth-Token": token }
  });

  const body = await upstream.text();
  response.status(upstream.status);
  response.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
  response.send(body);
}
