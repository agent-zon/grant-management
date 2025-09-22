import type { Route } from "./+types/home.ts";
import { Welcome } from "../welcome/welcome.tsx";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Grants - Grant Management Platform" },
    { name: "description", content: "Secure AI agent permission management with consent-aware access control" },
  ];
}

export function loader() {
  return {
    denoVersion: Deno.version.deno,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome denoVersion={loaderData.denoVersion} />;
}
