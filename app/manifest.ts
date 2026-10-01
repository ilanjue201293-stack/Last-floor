import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIGHT TRAIN",
    short_name: "NIGHT TRAIN",
    description: "Rentrez chez vous. Vos décisions peuvent vous rattraper plusieurs arrêts plus tard.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#05070b",
    orientation: "portrait"
  };
}
