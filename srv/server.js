import express from "express";
import cds from "@sap/cds";

import compression from "compression";
const app = express();
// app.use(
//   createRequestListener({
//     build: rtlBuild,
//   })
// );
// // needs to handle all verbs (GET, POST, etc.)
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cds.serve("all").in(app);

// eslint-disable-next-line import/no-anonymous-default-export
/*

export default (o) => {
  const port = o.port || Number.parseInt(process.env.PORT || "4004");

  o.from = "./grant-management-service.cds";
  o.app = app;
  o.port = process.env.PORT || "4004";
  o.host = process.env.HOST || "0.0.0.0";
  //   o.health = true;
  o.static = "dist/client";
  o.favicon = () => {
    return express.static("app/portal/dist/client/favicon.ico");
  };
  o.index = () => {
    return express.static("app/portal/dist/client/index.html");
  };
  o.logger = console;
  o.server = app.listen(port, () => {
    console.log(`Server listening on port ${port} (http://localhost:${port})`);
  });
  return cds.server(o); //> delegate to default server.js
};
*/