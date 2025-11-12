import { StreamableHTTPClientTransport, StreamableHTTPReconnectionOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { FetchLike, Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
    alwaysProvider,
    alwaysSubscriber,
    Destination,
    getDestination, getDestinationFromServiceBinding,
    useOrFetchDestination
} from '@sap-cloud-sdk/connectivity'
import { executeHttpRequest, Method } from '@sap-cloud-sdk/http-client'
import { Context } from 'hono'
import {getDestinationFromEnvByName, getDestinationsFromEnv} from "@sap-cloud-sdk/connectivity/internal";
import { retrieveJwt } from '@sap-cloud-sdk/connectivity';

export interface TransportOptions {
    destinationName: string
    path: string
    app2appDependency?: string
    sessionId?: string
    isCacheDisabled?: string
}

export class TransportProviderError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'mcp-client-transport'
    }
}

export const RECONNECTION_OPTIONS: StreamableHTTPReconnectionOptions = {
    maxRetries: 1,
    initialReconnectionDelay: 500, // 0.5 seconds
    maxReconnectionDelay: 30_000, // 30 seconds
    reconnectionDelayGrowFactor: 1.5, // Increase delay by 50% after each attempt
}

export class TransportProvider {
    private static readonly logger = console;

    protected constructor() {}

    private static getFetchLike(destination: Destination): FetchLike {
        return async (input: string | URL, init?: RequestInit): Promise<Response> => {
            TransportProvider.logger.debug('Executing HTTP request with URL:', input, 'and options:', init, 'against destination:', destination.name)

            // header object to dictonary
            const headerObject = new Headers(init?.headers)
            const headerMap = Object.fromEntries(headerObject.entries())

            try {
                const response = await executeHttpRequest(
                    {
                        ...destination,
                        url: input.toString(),
                        
                    },
                    {
                        method: (init?.method?.toUpperCase() as Method) || 'GET',
                        headers: headerMap,
                        data: init?.body,
                        responseType: 'stream',
                    },
                    {
                        fetchCsrfToken: false,
                    },
                )

                TransportProvider.logger.debug('HTTP request executed successfully:', response)

                // In error case return axios error message as response body
                if (response.status >= 400) {
                    return new Response(response.message, {
                        headers: response.response.headers,
                        statusText: response.response.statusText,
                        status: response.status,
                    })
                }

                return new Response(response.data, {
                    headers: response.headers,
                    status: response.status,
                })
            } catch (error) {
                TransportProvider.logger.warn('Error executing HTTP request:', error)
                throw new TransportProviderError(`Failed to execute HTTP request: ${error}`)
            }
        }
    }

    public static async getDestination(c:Context, destinationName: string, isCacheDisabled?: string): Promise<Destination | null> {
            let consumerToken =  c.req.header('Authorization')?.replace('Bearer ', '')
           

            let cacheControlFlag = true

            if (!!isCacheDisabled) {
                cacheControlFlag = false
            }


            try {
                const destination = await getDestination({
                    // serviceBindingTransformFn: async (service,options) => {
                    //     console.debug("serviceBindingTransformFn called for service", service.name, "with options", options);
                    //     // Here you can modify the service object as needed
                    //     var dest = getDestinationFromServiceBinding({
                    //          iss: options?.jwt?.iss,
                    //         destinationName: service.name,
                    //     });
                    //     
                    //     return {
                    //         ...service,
                    //         url:"" + service.url + "/",
                    //         ...dest,
                    //
                    //     }
                    //   },
                    destinationName: destinationName,
                    jwt: consumerToken,
                    selectionStrategy: alwaysProvider,
                    useCache: cacheControlFlag,

                })
                return destination

            }
            catch (error:any) {
                console.warn(`Error retrieving destination '${destinationName}':`, error.message)
                 return null
            }
 
        
    }

    private static checkForAuthTokenError(destination: Destination) {
        const authTokens = destination.authTokens
        if (authTokens && authTokens.length > 0) {
            const authToken = authTokens[0]
            if (authToken.error) {
                throw new TransportProviderError(`Error retrieving auth token for destination '${destination.name}': "${authToken.error}"`)
            }
        }
    }

    public static async getTransportForToolkit(c:Context, option: TransportOptions): Promise<Transport> {
        TransportProvider.logger.debug('Getting transport for MCP toolkit with options:', option)
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || ""
        try {
            const destination = (await TransportProvider.getDestination(c,option.destinationName, option.isCacheDisabled)) || {
                name: option.destinationName,
                url: c.env.MCP_URL,
                authTokens:[ {
                    type:"Bearer",
                    value: token,
                    http_header:{
                        key: "x-approuter-authorization",
                        value: `Bearer ${token}`
                    },
                    error: null
                }]
                
            }

           

            // TransportProvider.checkForAuthTokenError(destination)

            return new StreamableHTTPClientTransport(new URL(`${destination?.url || c.env.MCP_URL}${option.path}`), {
                fetch: TransportProvider.getFetchLike(destination),
                sessionId: option?.sessionId ?? undefined,
                reconnectionOptions: RECONNECTION_OPTIONS,
            })
        } catch (error: any) {
            console.warn('Error getting transport for MCP toolkit:', error.message, error.stack)

            if (error instanceof TransportProviderError) {
                throw error // Re-throw known TransportProviderError
            }

            throw new TransportProviderError(`Failed to get transport for MCP toolkit: ${error}`)
        }
    }
}