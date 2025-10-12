import { ApiAuthorizationDetailRequest, AuthorizationDetailRequest } from "#cds-models/grant/management";

export type AuthorizationDetailProps  =  AuthorizationDetailRequest & {index: number, description: string, riskLevel: 'low' | 'medium' | 'high', category: string}
