import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kein „N“-Knopf unten links in der Vorschau: er verdeckt Avatar und Tab-Leiste. Fehler zeigt Next trotzdem an.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
