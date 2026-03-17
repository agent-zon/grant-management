import cds from "@sap/cds";
import {
  destinations,
} from "#cds-models/sap/scai/destinations/DestinationManagementService";
import { LIST } from "./handler.list";
import { GET } from "./handler.detail";
import { REGISTER } from "./handler.register";
import { DRAFT } from "./handler.draft";
import Discovery from "./handler.discovery";
import BIND from "./handler.bind";
import AUTH from "./handler.authentication";

export default class Service extends cds.ApplicationService {
  init() {
    this.on("READ", destinations, GET);
    //@ts-ignore
    this.on("READ", destinations, LIST);
    // Draft: register form UI (GET /dest/draft()) for HTMX hx-get
    this.on("draft", destinations, DRAFT);
    this.on("authentication", AUTH);
    // Register a new MCP server destination (dedicated route for HTMX)
    this.on("POST", REGISTER);
    this.on("discovery", destinations, Discovery);
    this.on("bind", destinations, BIND);


    return super.init();
  }


}

export type DestinationManagementService = Service & typeof cds.ApplicationService;

export type DestinationsHandler = cds.CRUDEventHandler.On<
  destinations,
  void | destinations | Error
>;
