// Centralized URL configuration for Grant Management services

const DEFAULT_APP_SRV = 'https://grant-management-srv-tomer-dev.c-127c9ef.stage.kyma.ondemand.com';
const DEFAULT_APP_ROUTER = 'https://grant-management-approuter-tomer-dev.c-127c9ef.stage.kyma.ondemand.com';

// Base host for services (canonical only)
export const API_HOST =
  process.env.GRANT_MANAGEMENT_HOST ||
  DEFAULT_APP_SRV;

// Path prefix for Grants API
export const GRANTS_PATH_PREFIX =
  process.env.GRANTS_PATH_PREFIX || '/grants-management';

// Fully qualified base for Grants API
export const GRANT_MANAGEMENT_SRV =
  process.env.GRANT_MANAGEMENT_SRV || `${API_HOST}${GRANTS_PATH_PREFIX}`;

// OAuth server base (defaults to API_HOST)
export const OAUTH_SERVER_SRV =
  process.env.OAUTH_SERVER_SRV || API_HOST;

// Approuter base for user authorization UI
export const APP_ROUTER_BASE =
  process.env.APP_ROUTER_BASE || DEFAULT_APP_ROUTER;
