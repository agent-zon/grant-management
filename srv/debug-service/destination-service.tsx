import {registerDestination, useOrFetchDestination} from "@sap-cloud-sdk/connectivity";
import cds, {ApplicationService} from "@sap/cds";
import {Destinations} from "#cds-models/sap/scai/debug/DestinationService";
import * as util from "node:util";
import {Destination} from "#cds-models/sap/scai/debug";
import {isNativeError} from "node:util/types";
import {Entity} from "#cds-models/_";
 // import {DestinationCds} from "#cds-models/sap/scai/grants";

export  default class DestinationService extends ApplicationService {
    
    async token(entity: any, {name,...more}: {name: string}, ...args) {
        console.debug(`Generating token for destination:`,name,util.inspect(entity, {depth: 2, colors: true, breakLength:200}),"\nparams", util.inspect(more, {depth: 2, colors: true, breakLength:200}),"\nargs", util.inspect(args, {depth: 2, colors: true, breakLength:200}));
        const destination = await this.send("GET", Destinations, {name}) as Destination | undefined;
        console.debug(`Fetched destination for token generation:`, util.inspect(destination, {depth: 1, colors: true, breakLength:10}),util.inspect(destination?.authTokens, {depth: 2, colors: true, breakLength:10}));
        return destination?.authTokens || [];
    }
    
    async init() { 
         this.on("*", async (req, next) => {
             try {
                 console.debug(`➡️  Incoming request: ${req.method} ${req.path} - Data:`, req.data);
                const res= await next();
                 console.debug(`⬅️  Outgoing response: ${req.method} ${req.path} - Data:`, res);
                 return res;
             } catch (error) {
                 console.error(`❌ Error processing request: ${req.method} ${req.path} - Error:`, error);
                 throw error; // Re-throw the error after logging it
             }
         });
         
        this.on("CREATE", Destinations, async (req, next) => {
            console.debug(`➡️  Incoming request: ${req.method} ${req.path} - Data:`, req.data);
            await registerDestination({
                name: req.data.name!,
                authentication: 'NoAuthentication',
                url: "https://agents-srv-grant-management.c-127c9ef.stage.kyma.ondemand.com/grants-management",
                tokenServiceUrl: cds.env.requires.auth.credentials?.url!,
                certificates:[
                    {
                        name: 'client-cert',
                        content: cds.env.requires.auth.credentials?.key!,
                        type: cds.env.requires.auth.credentials?.['credential-type']
                    },
                    {
                        name: 'client-key',
                        content: cds.env.requires.auth.credentials?.key!,
                        type: cds.env.requires.auth.credentials?.['credential-type']
                    }
                ],


            })

            const res= await next();
            console.debug(`⬅️  Outgoing response: ${req.method} ${req.path} - Data:`, req.data);
            return res;
        });

        this.on("READ", Destinations, async (req, next) => {
            console.debug(`➡️  Incoming request: ${req.method} ${req.path} - Data:`, req.data, "Query:", util.inspect(req.query, {depth: 6, colors: true}));
            const res= await next();
            console.debug(`⬅️  Outgoing response: ${req.method} ${req.path} - Data:`, req.data);
            return res;
        });
        this.on("READ", Destinations, async (req, next) => {
             
            if(req.data?.name ) {
                const {jwt} = req.user.authInfo?.token || {}
                const {name} = req.data ;
                console.debug(`Dest: ${req.method} ${req.path} - Fetching destination for name:`, name);

                const destination = await useOrFetchDestination({
                    destinationName: name!,
                    jwt: jwt
                })
                console.debug(`Dest: ${req.method} ${req.path} - Data:`, destination);

                req.reply({
                    ...req.data,
                    ...destination,
                    authTokens: destination?.authTokens?.map(token => ({
                        ...token,
                        http_header: token.http_header ? {
                            name: token.http_header.key,
                            value: token.http_header.value
                        } : undefined
                    })),
                    name: destination?.name!
                });
            }
            return await next();
        });        
        this.on("token", Destinations, async (req, next) => {
            const {params ,data}= req;
            console.debug(`➡️  Incoming request: token for destination.\nData:\n`, util.inspect(data, {depth: 4, colors: true}), "\nparams:\n",util.inspect(params, {depth: 4, colors: true}));            
            const res= await next();
            console.debug(`⬅️  Outgoing response: token for destination.\nData:`, util.inspect(res, {depth: 4, colors: true}));
            return req.reply(res && !isNativeError(res) ? res.authTokens : res)
        })
    }
}