import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import './global.css';
import '@ui5/webcomponents-react/dist/Assets.js';
const setTheme = () => { try {
    document.documentElement.setAttribute('data-ui5-theme', 'sap_horizon');
}
catch { } };
setTheme();
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(AuthProvider, { children: _jsx(App, {}) }) }) }));
