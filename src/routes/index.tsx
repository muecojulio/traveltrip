import { createFileRoute } from "@tanstack/react-router";
import { TravelApp } from "@/components/travel-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TravelApp />;
}
