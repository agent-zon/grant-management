import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Grants - Grant Management Platform" },
    {
      name: "description",
      content:
        "Secure AI agent permission management with consent-aware access control",
    },
  ];
}

export function loader() {
  return {
    nodeVersion: process.version,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome nodeVersion={loaderData.nodeVersion} />;
}
