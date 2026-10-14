import type { MetadataRoute } from "next";
import { APP_NAME, EVENT_NAME } from "@/lib/brand";

// Web-App-Manifest: Damit lässt sich das Tool am Handy auf den Home-Bildschirm legen
// und startet dann ohne Browser-Leiste wie eine App. Bewusst ohne Service Worker (kein Offline-Modus).
// Icons: „hack / vienna“ auf Schwarz mit Kobalt-Strich (public/icon-*.png); Favicon „hv“.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: EVENT_NAME,
    description: `Steuerung für ${EVENT_NAME} 2027`,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0c0d",
    theme_color: "#0c0c0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
