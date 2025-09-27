import express from "express";
import cds from "@sap/cds";

import compression from "compression";
const app = express();
// app.use(
//   createRequestListener({
//     build: rtlBuild,
//   })
// );
// // needs to handle all verbs (GET, POST, etc.)
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory stores for PAR and short links (demo-grade; replace with persistent storage if needed)
const parRequestStore = new Map(); // requestId -> { payload, expiresAt }
const shortLinkStore = new Map(); // shortId -> requestId

function generateId(prefix = "") {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${random}${time}`;
}

function buildRequestUri(id) {
  return `urn:grant-management:request_uri:${id}`;
}

function parseAuthorizationDetails(value) {
  if (!value) return [];
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (e) {
    return [];
  }
}

async function persistGrantCreateOrMerge({ req, action, grantId, clientId, redirectUri, authorizationDetails }) {
  const db = await cds.connect.to('db');
  const { Grants, ToolGrantAuthorizationDetails } = cds.entities['com.sap.agent.grants'];

  let grantRecordId = grantId;
  if (action === 'create' || (!grantRecordId)) {
    const insertData = {
      clientId: clientId || null,
      status: 'active',
      sessionId: null,
      ip: req?.ip || null,
      expiresAt: null,
      lastUsed: new Date()
    };
    const created = await INSERT.into(Grants).entries(insertData);
    grantRecordId = created?.ID || created; // CAP may return ID or entire row
  }

  if (!grantRecordId) throw Object.assign(new Error('failed_to_persist_grant'), { status: 500 });

  const detailsArray = Array.isArray(authorizationDetails) ? authorizationDetails : [];
  for (const item of detailsArray) {
    const actions = Array.isArray(item?.actions) ? item.actions : [];
    const locations = [];
    if (Array.isArray(item?.locations)) locations.push(...item.locations);
    if (Array.isArray(item?.resources)) locations.push(...item.resources);
    if (typeof item?.server === 'string') locations.push(item.server);

    const entry = {
      grant_ID: grantRecordId,
      type: item?.type || 'custom',
      actions: JSON.stringify(actions),
      locations: JSON.stringify(locations),
      toolName: item?.toolName || null,
      toolDescription: item?.toolDescription || null,
      riskLevel: item?.riskLevel || 'low',
      category: item?.category || null
    };
    await INSERT.into(ToolGrantAuthorizationDetails).entries(entry);
  }

  // Touch grant lastUsed timestamp on merge
  await UPDATE(Grants).set({ lastUsed: new Date() }).where({ ID: grantRecordId });

  return grantRecordId;
}

// PAR endpoint: accept pushed authorization requests and return short-lived request_uri
app.post('/as/par', async (req, res) => {
  // Expect application/x-www-form-urlencoded per spec; express.urlencoded already handles it
  const now = Date.now();
  const expiresIn = 90; // seconds
  const requestId = generateId('req_');
  const requestUri = buildRequestUri(requestId);

  const payload = {
    response_type: req.body?.response_type,
    client_id: req.body?.client_id,
    redirect_uri: req.body?.redirect_uri,
    code_challenge: req.body?.code_challenge,
    code_challenge_method: req.body?.code_challenge_method,
    grant_id: req.body?.grant_id,
    grant_management_action: req.body?.grant_management_action,
    authorization_details: parseAuthorizationDetails(req.body?.authorization_details)
  };

  parRequestStore.set(requestId, { payload, expiresAt: now + expiresIn * 1000 });

  // Optionally mint a short link id
  const shortId = generateId('c_');
  shortLinkStore.set(shortId, requestId);

  res.status(201).json({ request_uri: requestUri, expires_in: expiresIn, short: `/c/${shortId}` });
});

// Short link endpoint: redirects to /authorize with request_uri
app.get('/c/:id', (req, res) => {
  const requestId = shortLinkStore.get(req.params.id);
  if (!requestId) return res.status(404).json({ error: 'not_found', error_description: 'Unknown short link' });
  const requestUri = buildRequestUri(requestId);
  const url = new URL(req.protocol + '://' + req.get('host') + '/authorize');
  url.searchParams.set('request_uri', requestUri);
  res.redirect(302, url.toString());
});

// Authorization endpoint: handles create/merge via front-channel or PAR request_uri
app.get('/authorize', async (req, res) => {
  try {
    let params = {
      response_type: req.query?.response_type,
      client_id: req.query?.client_id,
      redirect_uri: req.query?.redirect_uri,
      grant_id: req.query?.grant_id,
      grant_management_action: req.query?.grant_management_action,
      authorization_details: parseAuthorizationDetails(req.query?.authorization_details)
    };

    const requestUri = req.query?.request_uri;
    if (requestUri && typeof requestUri === 'string') {
      const id = requestUri.split(':').pop();
      const entry = id && parRequestStore.get(id);
      if (!entry) return res.status(400).json({ error: 'invalid_request_uri' });
      if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'expired_request_uri' });
      params = entry.payload;
    }

    const action = String(params.grant_management_action || '').toLowerCase() || 'create';
    if (!['create', 'merge', 'update', 'replace'].includes(action)) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Unsupported grant_management_action' });
    }

    if ((action === 'merge' || action === 'update' || action === 'replace') && !params.grant_id) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'grant_id is required for merge/update/replace' });
    }

    const grantId = await persistGrantCreateOrMerge({
      req,
      action: action === 'update' ? 'merge' : action, // treat update as merge in persistence
      grantId: params.grant_id,
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
      authorizationDetails: params.authorization_details
    });

    // For demo purposes, directly return a token-like response including grant_id
    return res.json({ access_token: 'demo-access-token', refresh_token: 'demo-refresh-token', grant_id: grantId });
  } catch (e) {
    const status = e?.status || 500;
    return res.status(status).json({ error: 'server_error', error_description: e?.message || 'Unexpected error' });
  }
});

cds.serve("all").in(app);

// eslint-disable-next-line import/no-anonymous-default-export
/*

export default (o) => {
  const port = o.port || Number.parseInt(process.env.PORT || "4004");

  o.from = "./grant-management-service.cds";
  o.app = app;
  o.port = process.env.PORT || "4004";
  o.host = process.env.HOST || "0.0.0.0";
  //   o.health = true;
  o.static = "dist/client";
  o.favicon = () => {
    return express.static("app/portal/dist/client/favicon.ico");
  };
  o.index = () => {
    return express.static("app/portal/dist/client/index.html");
  };
  o.logger = console;
  o.server = app.listen(port, () => {
    console.log(`Server listening on port ${port} (http://localhost:${port})`);
  });
  return cds.server(o); //> delegate to default server.js
};
*/