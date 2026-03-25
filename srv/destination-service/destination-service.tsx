import cds from "@sap/cds";
import {
  destination,
  destinations,
} from "#cds-models/sap/scai/destinations/DestinationManagementService";
import { LIST } from "./handler.list";
import { Destination, GET,Discovery as DiscoveryHandler, Tools } from "./handler.detail";
import { REGISTER } from "./handler.register";
import { DRAFT } from "./handler.draft";
import Discovery from "./handler.discovery";
import BIND from "./handler.bind";
import AUTH from "./handler.authentication";

export async function JsonResponse(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandlerSingle>
): Promise<void | destination | Error | Response> {
  if(!req.http?.req.accepts("html") || req.http?.req.query.raw){
    return req.reply(req.data);
  }
  return await next(req);
}


export default class Service extends cds.ApplicationService {
  init() {
    this.on("READ", destinations, Destination);
    this.on("READ", destinations, JsonResponse); 
    this.on("READ", destinations, DiscoveryHandler );
    this.on("tools", destinations, Destination );
    this.on("tools", destinations, JsonResponse); 
    this.on("tools", destinations, DiscoveryHandler );

    this.on("tools", destinations, Tools );

    this.on("discovery", destinations, Discovery);

    this.on("bind", destinations, Destination );
    this.on("bind", destinations, JsonResponse); 
    this.on("bind", destinations, BIND);

     //@ts-ignore
    this.on("bind", destinations, BIND);

   
    // Draft: register form UI (GET /dest/draft()) for HTMX hx-get
    this.on("draft", destinations, DRAFT);
    this.on("authentication", AUTH);
    // Register a new MCP server destination (dedicated route for HTMX)
    this.on("POST", REGISTER);
    //@ts-ignore
    this.on("READ", destinations, LIST);
    this.on("READ", destinations, GET );


    return super.init();
  }


}

export type DestinationManagementService = Service & typeof cds.ApplicationService;

export type DestinationsHandler = cds.CRUDEventHandler.On<
  destinations ,
  void | destinations | Error
>;


export type DestinationsHandlerSingle = cds.CRUDEventHandler.On<
  destination ,
  void | destination | Error | Response
>;
