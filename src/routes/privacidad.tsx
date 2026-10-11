import { createFileRoute } from "@tanstack/react-router";
import { TravelApp } from "@/components/travel-app";

export const Route = createFileRoute("/privacidad")({
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return <TravelApp initialTab="privacidad" />;
}
