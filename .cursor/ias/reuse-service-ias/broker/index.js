'use strict';

var xsenv = require('@sap/xsenv');
xsenv.loadEnv();
//console.log(process.env['VCAP_SERVICES']);

const Broker = require('@sap/sbf');

const broker = new Broker({
    autoCredentials: true,
    hooks: {
        onProvision: (params, callback) => {
            console.log("provisioning hook")

            console.log("params::", JSON.stringify({ ...params, req:undefined}))
            console.log("Trace::", new Error().stack)
            if(params.request) {
                console.log("brokerContext::", params.request.brokerContext)
                if(params.request.brokerContext) {
                    console.log("brokerContext-Context::", params.request.brokerContext.context)
                }
            }
            callback(null);
        },
        onDeprovision: (params, callback) => {
            console.log("deprovisioning hook")
            console.log("params::", JSON.stringify({ ...params, req:undefined}))
            if(params.request) {
                console.log("brokerContext::", params.request.brokerContext)
                if(params.request.brokerContext) {
                    console.log("brokerContext-Context::", params.request.brokerContext.context)
                }
            }
            callback(null);
        },
        onUpdate: (params, callback) => {
            console.log("update hook")

            console.log("params::", JSON.stringify({ ...params, req:undefined}))
            console.log("Trace::", new Error().stack)
            if(params.request) {
                console.log("brokerContext::", params.request.brokerContext)
                if(params.request.brokerContext) {
                    console.log("brokerContext-Context::", params.request.brokerContext.context)
                }
            }
            callback(null);
        },
        onLastOperation: (params, callback) => {
            console.log("onLastOperation hook")
            console.log("params::", params)
            if(params.request) {
                console.log("brokerContext::", params.request.brokerContext)
                if(params.request.brokerContext) {
                    console.log("brokerContext-Context::", params.request.brokerContext.context)
                }
            }
            callback(null, { hookState: 'hookOK', state: params.state });
        },
        verifyClientCertificate: (params, callback) => {
            console.log("params::", JSON.stringify({ ...params, req:undefined}))
            callback(null);
        }
    }
});

broker.start();