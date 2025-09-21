import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface Crumb { label: string; path?: string; }

const labelMap: Record<string,string> = {
  '': 'Tool Policies',
  'grants': 'Grants',
  'grant-requests': 'Grant Requests'
};

export const Breadcrumbs: React.FC = () => {
  const { pathname } = useLocation();
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  if (segments.length === 0) {
    crumbs.push({ label: labelMap[''] });
  } else {
    // Only flat pages here, but keep generic
    const seg = segments[0];
    crumbs.push({ label: labelMap[seg] || seg.replace(/-/g,' ') });
  }
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Grant Management</Link>
      <span className="breadcrumbs-sep">/</span>
      {crumbs.map((c,i)=>(
        <span key={i} aria-current={i===crumbs.length-1? 'page': undefined}>{c.label}</span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;

