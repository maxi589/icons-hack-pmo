import type { MetadataRoute } from "next";

// Web-App-Manifest: Damit lässt sich das Tool am Handy auf den Home-Bildschirm legen
// und startet dann ohne Browser-Leiste wie eine App. Bewusst ohne Service Worker (kein Offline-Modus).
// Icons: Variante „Graphit + Lime-Strich“ (public/icon-*.png); Favicon „ic“ wie die eingeklappte Sidebar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "icons Hackathon PMO",
    short_name: "icons PMO",
    description: "Steuerung für den icons Hackathon 2027",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
