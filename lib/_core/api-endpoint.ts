/**
 * Accept only same-origin, root-relative API routes. This prevents a caller from
 * converting the configured API client into an arbitrary-origin request.
 */
export function safeEndpoint(endpoint: string): string {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//") || endpoint.includes("://") || /[\u0000-\u001F]/.test(endpoint)) {
    throw new Error("Invalid API endpoint");
  }
  return endpoint;
}
