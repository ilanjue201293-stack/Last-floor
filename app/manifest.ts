import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIGHT TRAIN",
    short_name: "NIGHT TRAIN",
    description: "Rentrez chez vous. Faites les bons choix. Parfois, ils prennent du temps à vous répondre.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
    orientation: "portrait"
  };
}