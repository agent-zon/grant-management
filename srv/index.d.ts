import cds from "@sap/cds";
declare module "@sap/cds" {

    interface EventContext {
        render: (component: React.ReactNode) => express.Response<any, Record<string, any>>
        ;
        html: (htmlString: string) => express.Response<any, Record<string, any>>
        ;

    }
   
}