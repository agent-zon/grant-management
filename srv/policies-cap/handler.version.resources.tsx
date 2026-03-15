import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";

 
/** GET Policies/.../resources → <option> elements for the datalist */
export async function RESOURCES(this: any, req: cds.Request) {
  const { resources } = req.data
  return sendHtml(req, resources.map(r => `<option value="${r.value}" label="${r.label}">${r.label}</option>`).join("\n"));
}
