interface CloudflareEnv {}

declare module '@cloudflare/workers-types' {
  interface IncomingRequestCf {
    // Add any specific Cloudflare request properties you need
    [key: string]: unknown;
  }
}