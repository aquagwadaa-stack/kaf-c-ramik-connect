import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/brunch")({
  beforeLoad: () => {
    throw redirect({ to: "/histoire", hash: "deroulement" });
  },
  component: () => null,
});
