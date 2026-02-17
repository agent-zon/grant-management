import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { registerDestination } from "@sap-cloud-sdk/connectivity";

/**
 * Register action handler — dedicated route for HTMX form consumption.
 * POST /dest/register (action body: name, url, authentication?, description?)
 * Returns HTML fragment for hx-swap="innerHTML" into #register-result.
 */
export async function REGISTER(req: cds.Request) {
  const body = req.data as Record<string, unknown>;
  const name = (body?.name ?? body?.Name) as string | undefined;
  const url = (body?.url ?? body?.Url) as string | undefined;
  const authentication = (body?.authentication ?? body?.Authentication) as string | undefined;
  const description = (body?.description ?? body?.Description) as string | undefined;

  if (!name?.trim() || !url?.trim()) {
    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="error" message="Name and URL are required." />
      );
    }
    return req.error?.(400, "Name and URL are required");
  }

  try {
    await registerDestination({
      name: name.trim(),
      url: url.trim(),
      authentication: (authentication as any) || "NoAuthentication",
    });

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="success" name={name.trim()} />
      );
    }

    return {
      status: "registered",
      name: name.trim(),
      url: url.trim(),
      authentication: authentication || "NoAuthentication",
      description,
    };
  } catch (err: any) {
    console.error("[register] Error registering destination:", err);

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="error" message={err?.message ?? "Registration failed"} />
      );
    }

    return req.error?.(500, err?.message ?? "Failed to register destination");
  }
}

/** HTMX-consumable fragment: success or error message for #register-result */
function RegisterResult({
  type,
  name,
  message,
}: {
  type: "success" | "error";
  name?: string;
  message?: string;
}) {
  if (type === "success" && name) {
    return (
      <div className="flex items-center space-x-2 text-emerald-700" id="register-result-content">
        <span>✅</span>
        <span className="text-sm font-medium">
          Destination <span className="font-mono">{name}</span> registered successfully
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2 text-red-600" id="register-result-content">
      <span>❌</span>
      <span className="text-sm">{message ?? "Registration failed"}</span>
    </div>
  );
}
