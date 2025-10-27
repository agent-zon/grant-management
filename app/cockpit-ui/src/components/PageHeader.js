import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Title } from '@ui5/webcomponents-react';
export const PageHeader = ({ title, subtitle, actions }) => {
    return (_jsxs("div", { className: "page-header", children: [_jsxs("div", { className: "page-header-text", children: [_jsx(Title, { level: "H4", className: "page-header-title", children: title }), subtitle && _jsx("div", { className: "page-header-subtitle", children: subtitle })] }), actions && _jsx("div", { className: "page-header-actions", children: actions })] }));
};
export default PageHeader;
