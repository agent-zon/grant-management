import mcp from "./mcp.tsx";
import api from "./api.tsx";
import fs from "./fs.tsx";
import database from "./database.tsx";
import type { AuthorizationDetailRequest } from "#cds-models/com/sap/agent/grants";
import type { AuthorizationDetailProps } from "./types.tsx";

const templates = {
  mcp,
  api,
  fs,
  database,
};

export function AuthorizationDetailComponent({
  type_code,
  index,
  ...authorizationDetails
}: AuthorizationDetailRequest & AuthorizationDetailProps & { index: number }) {
  // Load metadata for the type
  const Component = templates[type_code as keyof typeof templates];
  console.log("🔧 Component:", Component);

  return (
    <>
      <input
        type="hidden"
        name={`authorization_details[${index}].type`}
        value={type_code!}
      />
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Identifier</label>
        <input
          type="text"
          name={`authorization_details[${index}].identifier`}
          defaultValue={(authorizationDetails as any).identifier as any}
          placeholder="e.g., fs-home, api-admin, mcp-default"
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
          required
        />
      </div>

      <Component
        index={index}
        type_code={type_code}
        {...authorizationDetails}
      />
    </>
  );
}

export default AuthorizationDetailComponent;
