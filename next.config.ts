import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kein „N“-Knopf unten links in der Vorschau: er verdeckt Avatar und Tab-Leiste. Fehler zeigt Next trotzdem an.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // „Meine Aufgaben“ heißt seit Welle 1 „Für mich“ (alte Links und Lesezeichen funktionieren weiter).
  async redirects() {
    return [
      { source: "/meine-aufgaben", destination: "/fuer-mich", permanent: false },
      // „Wissen“ heißt seit Welle 1 „Dokumente“ (Direktlinks ?entscheidung=… bleiben gültig, die Adresszeile wird mitgenommen).
      { source: "/wissen", destination: "/dokumente", permanent: false },
    ];
  },
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
