import cds from "@sap/cds";
import type GrantManagementService from "../grant-management";

export default function (srv: GrantManagementService) {
  const { Grants } = srv.entities;
  srv.before("DELETE", Grants, async function (req) {
    const grant = await srv.update(Grants, req.data.ID).with({
      status: "revoked",
      modifiedBy: req.user,
    });

    if (cds.context?.http?.req.accepts("html")) {
      return cds.context?.render(<div>Grant revoked</div>);
    }
    return grant;
  });
}
