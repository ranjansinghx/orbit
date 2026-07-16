/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage — this is where uploaded avatars/post media
      // actually live. Without this, next/image silently refuses to
      // render any of it (broken image + alt text showing instead).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
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
