'use strict';

const request = require('request').defaults({timeout: parseInt(process.env.SBF_UAA_TIMEOUT) || 20000});
const createError = require('http-errors');

const BROKER_MSG = '%sBroker responded with status code %d: %s';
const BROKER_LOG_MSG = '%sBroker responded with status code %d and body %s';

class IASOSBProvider {
    // OsbProxyProvider supports tls authentication.
    // Requires: certificate, key and base-url as part of the credentials object.
    constructor(credentials) {
        if (credentials.certificate && !credentials.key) {
            throw new Error('Client certificate key must be provided');
        }
        if (!credentials.osb_url) {
            throw new Error('Base Url param must be provided');
        }

        this._baseUrlParam = credentials.osb_url;
        this._credentials = credentials;
        this.osbProxyName = 'IAS';
    }


    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    sayHello = async function () {
        try {
            await this.sleep(1000);
            console.log('Hallo Welt!');
        } catch (ex) {
            console.log("ex" + ex);
        }
    };

    async provision(instanceId, osbRequest, cb) {
        try {
            console.log("OSB Request - " + osbRequest)
            console.log("OSB Request broker Context - " + osbRequest.brokerContext)
            let provisionResult = await this._provisionPromise(osbRequest, instanceId);
            await this.checkForStatus(instanceId, 200, 'succeeded');
        } catch (err) {
            throw new Error(err);
        }
    }

    async deprovision(instanceId, serviceId, planId) {
        await this._deletePromise(instanceId, serviceId, planId);
        await this.checkForStatus(instanceId, 410, null);
    }

    async update(req, cb) {
        return this.provision(req, cb);
    }

    async checkForStatus(instanceId, statusCode, message) {
        let completed = false;
        try {
            while (completed == false) {
                let checkResult = await this._lastOperationPromise(instanceId);
                if ((statusCode == checkResult.statusCode && message == null) || (message == checkResult.body.state || statusCode == checkResult.statusCode)) {
                    completed = true;
                    return checkResult;
                } else {
                    await this.sleep(200);
                }
            }

        } catch (err) {
            throw new Error(err);
        }
    }

    _provisionPromise(osbRequest, instanceId) {
        var options = {
            cert: this._credentials.certificate.replace(new RegExp('\\\\n', 'g'), '\n'),
            key: this._credentials.key.replace(new RegExp('\\\\n', 'g'), '\n'),
            body: osbRequest,
            method: 'PUT',
            uri: this._baseUrlParam + '/v2/service_instances/' + instanceId + '?accepts_incomplete=true',
            headers: {
                'x-broker-api-version': '2.15'
            },
            json: true,
            baseUrl: this._credentials[this._baseUrlParam]
        };


        var provisionPromise = new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(new Error(error));
                    return;
                }
                const isValidBody = body instanceof Object;
                if (!isValidBody) {
                    reject(new Error('Invalid body object'));
                    return;
                }

                switch (response.statusCode) {
                    case 200:
                    case 201:
                        resolve(body);
                        return;
                    case 202:
                        body.async = true;
                        resolve(body);
                        return;
                    default: {
                        const description = body.description || body.error || response.statusMessage || 'Unknown Cause';
                        // const message = format(BROKER_MSG, this.osbProxyName, response.statusCode, description);
                        reject(createError(response.statusCode, description));
                        return;
                    }
                }
            });
        });
        return provisionPromise;
    }

    _lastOperationPromise(instanceId) {
        var options = {
            cert: this._credentials.certificate.replace(new RegExp('\\\\n', 'g'), '\n'),
            key: this._credentials.key.replace(new RegExp('\\\\n', 'g'), '\n'),
            method: 'GET',
            uri: this._baseUrlParam + '/v2/service_instances/' + instanceId + '/last_operation',
            headers: {
                'x-broker-api-version': '2.15'
            },
            json: true,
            baseUrl: this._credentials[this._baseUrlParam]
        };


        var _lastOperationPromise = new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(new Error(error));
                    return;
                }
                const isValidBody = body instanceof Object;
                if (!isValidBody) {
                    reject(new Error('Invalid body object'));
                    return;
                }

                switch (response.statusCode) {
                    case 200:
                        resolve({body: response.body, statusCode: response.statusCode});
                    case 410:
                        resolve({body: response.body, statusCode: response.statusCode});
                        return;
                    default: {
                        const description = body.description || body.error || response.statusMessage || 'Unknown Cause';
                        //const message = format(BROKER_MSG, this.osbProxyName, response.statusCode, description);
                        reject(createError(response.statusCode, description));
                        return;
                    }
                }
            });
        });
        return _lastOperationPromise;
    }

    _deletePromise(instanceId, serviceId, planId) {
        var options = {
            cert: this._credentials.certificate.replace(new RegExp('\\\\n', 'g'), '\n'),
            key: this._credentials.key.replace(new RegExp('\\\\n', 'g'), '\n'),
            method: 'DELETE',
            uri: this._baseUrlParam + '/v2/service_instances/' + instanceId + '?service_id=' + serviceId + '&accepts_incomplete=true&plan_id=' + planId,
            headers: {
                'x-broker-api-version': '2.15'
            },
            json: true,
            baseUrl: this._credentials[this._baseUrlParam]
        };


        var _deletePromise = new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(new Error(error));
                    return;
                }
                const isValidBody = body instanceof Object;

                if (response.statusCode!=410 && !isValidBody) {
                    reject(new Error('Invalid body object'));
                    return;
                }
                switch (response.statusCode) {
                    case 200:
                        resolve(response);
                    case 202:
                        resolve();
                    case 410:
                        resolve(response);
                        return;
                    default: {
                        const description = body.description || body.error || response.statusMessage || 'Unknown Cause';
                        //const message = format(BROKER_MSG, this.osbProxyName, response.statusCode, description);
                        reject(createError(response.statusCode, description));
                        return;
                    }
                }
            });
        });
        return _deletePromise;
    }



    _handleProxyRequest(req, cb) {
        return this._executeProxyRequest(req, this._generateOptions(req)).then((body) => {
            cb(null, body);
        }, cb);
    }

    _executeProxyRequest(req, options) {
        const tracer = req.loggingContext && req.loggingContext.getTracer(__filename);

        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(new Error(error));
                    return;
                }
                const isValidBody = body instanceof Object;
                if (!isValidBody) {
                    reject(new Error('Invalid body object'));
                    return;
                }

                if (tracer) {
                    //tracer.debug(util.format(BROKER_LOG_MSG, this.osbProxyName, response.statusCode, loggify(body)));
                }

                switch (response.statusCode) {
                    case 200:
                    case 201:
                        resolve(body);
                        return;
                    case 202:
                        body.async = true;
                        resolve(body);
                        return;
                    default: {
                        const description = body.description || body.error || response.statusMessage || 'Unknown Cause';
                        //const message = format(BROKER_MSG, this.osbProxyName, response.statusCode, description);
                        reject(createError(response.statusCode, description));
                        return;
                    }
                }
            });
        });
    }

    _generateOptions(req) {
        return {
            cert: this._credentials.certificate.replace(new RegExp('\\\\n', 'g'), '\n'),
            key: this._credentials.key.replace(new RegExp('\\\\n', 'g'), '\n'),
            body: req.method !== 'GET' ? req.brokerContext : undefined,
            method: req.method,
            uri: req.originalUrl,
            headers: {
                'x-broker-api-version': '2.15'
            },
            json: true,
            baseUrl: this._credentials[this._baseUrlParam]
        };
    }


    function

    loggify(data, sensitiveFields = SENSITIVE_FIELDS) {
        return JSON.stringify(data, (key, value) => {
            const lowerCaseKey = key.toLowerCase();
            if (sensitiveFields.includes(lowerCaseKey)) {
                const replaceValue = (lowerCaseKey === 'authorization' ? 'Bearer ' : '') + '[HIDDEN DATA]';
                return replaceValue;
            }
            return value;
        }, 2);
    }
}

module.exports = IASOSBProvider;