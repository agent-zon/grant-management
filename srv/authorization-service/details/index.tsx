import mcp from "./mcp.tsx";
import api from "./api.tsx";
import fs from "./fs.tsx";
import database from "./database.tsx";
import type { AuthorizationDetailRequest } from "#cds-models/sap/scai/grants";
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

      <Component
        index={index}
        type_code={type_code}
        {...authorizationDetails}
      />
    </>
  );
}

export default AuthorizationDetailComponent;
