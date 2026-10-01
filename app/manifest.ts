import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LAST FLOOR",
    short_name: "LAST FLOOR",
    description: "Climb the mysterious 100-floor tower.",
    start_url: "/",
    display: "standalone",
    background_color: "#06080b",
    theme_color: "#06080b",
    orientation: "portrait",
  };
}
