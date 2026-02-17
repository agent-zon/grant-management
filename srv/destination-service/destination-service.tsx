import cds from "@sap/cds";
import {
  Destinations,
} from "#cds-models/sap/scai/destinations/DestinationManagementService";
import { LIST } from "./handler.list";
import { GET } from "./handler.detail";
import { REGISTER } from "./handler.register";

export default class Service extends cds.ApplicationService {
  init() {
    this.on("READ", Destinations, GET);
    this.on("READ", Destinations, LIST);
    // Register a new MCP server destination (dedicated route for HTMX)
    this.on("register", REGISTER);

    // Discover tools from an MCP server destination
    this.on("discover", GET);

    return super.init();
  }


}

export type DestinationManagementService = Service & typeof cds.ApplicationService;

export type DestinationsHandler = cds.CRUDEventHandler.On<
  Destinations,
  void | Destinations | Error
>;
