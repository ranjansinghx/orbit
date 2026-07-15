/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

// Lets `next dev` see Cloudflare bindings (env vars, KV, etc.) the same way
// the deployed Worker will. Only runs in development so `next build` and CI
// stay fast and don't spin up a Miniflare instance for nothing.
if (process.env.NODE_ENV !== "production") {
  import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}

module.exports = nextConfig;
