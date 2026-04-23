// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { spawn } from "node:child_process";
import { createBuilder } from "./.modules/aspire.js";

const builder = await createBuilder();

const rootDir = process.cwd();

const localMode = process.env.ASPIRE_LOCAL_ONLY === "1";
const localProfile = process.env.CDS_PROFILE ?? (localMode ? "dev" : "hybrid");

const cdsRunScript =
  process.env.CDS_RUN_SCRIPT ??
  (localMode ? "serve:cds:local" : "serve:cds:hybrid");

const approuterRunScript =
  process.env.APPROUTER_RUN_SCRIPT ??
  (localMode ? "serve:approuter:local" : "serve:approuter");

const portalRunScript = process.env.PORTAL_RUN_SCRIPT ?? "dev";
const runPortal = process.env.ASPIRE_ENABLE_PORTAL === "1";
const effectiveKubeconfig =
  process.env.KUBECONFIG ?? process.env.REMOTE_KUBECONFIG ?? "";
const enableApprouter =
  process.env.ASPIRE_ENABLE_APP_ROUTER !== "0" &&
  process.env.ASPIRE_ENABLE_APPROUTER !== "0";

async function runCommand(
  command: string,
  args: string[],
): Promise<{ success: boolean; errorMessage?: string }> {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      resolve({ success: false, errorMessage: error.message });
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          errorMessage: `Command exited with code ${code ?? "unknown"}.`,
        });
      }
    });
  });
}

async function bindResource(resource: "auth" | "destination" | "github" | "srv" | "router" | "all") {
  return await runCommand("bash", [
    "scripts/aspire/cds-bind-run.sh",
    resource,
    "--profile",
    "hybrid",
    "--",
    "npm",
    "run",
    "bind:list",
  ]);
}

const cds = await builder
  .addExecutable("cds", "npm", rootDir, ["run", cdsRunScript])
  .withHttpEndpoint({ env: "PORT", port: 4004, isProxied: false })
  .withExternalHttpEndpoints()
  .withEnvironment("NODE_ENV", "development")
  .withEnvironment("CDS_ENV", localProfile)
  .withEnvironment("CDS_PROFILE", localProfile)
  .withEnvironment("KUBECONFIG", effectiveKubeconfig)
  .withCommand(
    "bind-auth",
    "Bind IAS auth (k8s)",
    async () => await bindResource("auth"),
    {
      commandOptions: {
        description: "Run cds bind for IAS auth and print current bindings.",
        iconName: "key",
      },
    },
  )
  .withCommand(
    "bind-destination",
    "Bind destination service (k8s)",
    async () => await bindResource("destination"),
    {
      commandOptions: {
        description:
          "Bind destination service from the current KUBECONFIG context.",
        iconName: "server",
      },
    },
  )
  .withCommand("bind-all", "Bind all service dependencies (k8s)", async () => {
    return await bindResource("all");
  }, {
    commandOptions: {
      description:
        "Bind auth, destination, github, srv and approuter from the active KUBECONFIG context.",
      iconName: "plug",
    },
  })
  .withCommand(
    "bind-github",
    "Bind github credentials (k8s)",
    async () => await bindResource("github"),
    {
      commandOptions: {
        description: "Bind github credentials used by admin policy integrations.",
        iconName: "github",
      },
    },
  )
  .withCommand(
    "bind-router",
    "Bind approuter app services (k8s)",
    async () => await bindResource("router"),
    {
      commandOptions: {
        description:
          "Bind approuter app services from Kyma to test remote destination routing.",
        iconName: "router",
      },
    },
  );

const approuter = enableApprouter
  ? await builder
      .addExecutable("approuter", "npm", rootDir, ["run", approuterRunScript])
      .withHttpEndpoint({ env: "PORT", port: 9000, isProxied: false })
      .withExternalHttpEndpoints()
      .withReference(cds)
      .withEnvironment("NODE_ENV", "development")
      .withEnvironment("KUBECONFIG", effectiveKubeconfig)
      .waitFor(cds)
  : null;

if (runPortal) {
  const portal = await builder
    .addExecutable("portal", "npm", rootDir, ["run", portalRunScript, "-w", "portal"])
    .withHttpEndpoint({ env: "PORT", port: 3000, isProxied: false })
    .withExternalHttpEndpoints()
    .withEnvironment("NODE_ENV", "development")
    .withEnvironment("CDS_URL", "http://localhost:4004")
    .withEnvironment("KUBECONFIG", effectiveKubeconfig)
    .withReference(cds)
    .waitFor(cds);

  if (approuter) {
    await approuter.withReference(portal, {
      name: "portal",
      optional: true,
    });
  }
}

await builder.build().run();