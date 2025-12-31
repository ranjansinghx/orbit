import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Orbit has no ISR/SSG pages (every route is either a client component or
// fully dynamic behind auth), so the default in-memory cache is enough here.
// If you add revalidating routes later, see the KV cache option in the
// OpenNext Cloudflare docs: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
