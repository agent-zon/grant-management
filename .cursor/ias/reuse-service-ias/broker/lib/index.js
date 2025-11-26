'use strict';

const Broker = require('@sap/sbf');
const IASOSBProvider = require(('./IASOSBProvider.js'))
const assert = require('assert');
const CREATE_SERVICE_MILLIS = 1 * 1000;
let provisionData = {};
const xsenv = require('@sap/xsenv');
const identity = xsenv.filterServices({label: 'identity'});
assert(identity.length > 0, 'No identity service found');
const iasProvider = new IASOSBProvider(identity[0].credentials)
const broker = new Broker({
    autoCredentials: true,
    hooks: {
        onProvision: (params, callback) => {
            provisionData[params['instance_id']] = false;

            // Delay the response with async function to simulate resource creation (like database schemas etc.)
            setTimeout(() => {
                provisionData[params['instance_id']] = true;
            }, CREATE_SERVICE_MILLIS);

            // Because of { async: true } provision operation will be asynchronous
            console.log(JSON.stringify(params.req.body));
            iasProvider.provision(params['instance_id'], params.req.body)
            callback(null, {async: true});
        },
        onDeprovision: (params, callback) => {
            // Free any resources created during provision of the service instance
            try {
                iasProvider.deprovision(params['instance_id'], params['service_id'], params['plan_id'])
                    .then(result => {
                        callback(null, {});
                    })
                    .catch(err => {
                        callback(result.body, null)
                    })
            } catch (ex) {
                console.log(ex)
            }
        },
        onLastOperation: (params, callback) => {
            iasProvider._lastOperationPromise(params['instance_id'])
                .then(result => {
                    callback(null, result.body);
                })
                .catch(err => {
                    callback(result.body, null)
                })
        }
    }
});
broker.start();