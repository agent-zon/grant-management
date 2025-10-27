import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, Link } from 'react-router-dom';
const labelMap = {
    '': 'Tool Policies',
    'grants': 'Grants',
    'grant-requests': 'Grant Requests'
};
export const Breadcrumbs = () => {
    const { pathname } = useLocation();
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const crumbs = [];
    if (segments.length === 0) {
        crumbs.push({ label: labelMap[''] });
    }
    else {
        // Only flat pages here, but keep generic
        const seg = segments[0];
        crumbs.push({ label: labelMap[seg] || seg.replace(/-/g, ' ') });
    }
    return (_jsxs("nav", { className: "breadcrumbs", "aria-label": "Breadcrumb", children: [_jsx(Link, { to: "/", children: "Grant Management" }), _jsx("span", { className: "breadcrumbs-sep", children: "/" }), crumbs.map((c, i) => (_jsx("span", { "aria-current": i === crumbs.length - 1 ? 'page' : undefined, children: c.label }, i)))] }));
};
export default Breadcrumbs;
