import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  defaultCollapsed?: boolean;
}

export function SidebarLayout({
  sidebar,
  children,
  title,
  defaultCollapsed = false,
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Persist collapsed state to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside
        className={`
          bg-gray-800/50 backdrop-blur-sm border-r border-gray-700
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isCollapsed ? "w-16" : "w-80"}
        `}
      >
        {/* Sidebar Header with Toggle */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {!isCollapsed && title && (
            <h2 className="text-lg font-semibold text-white truncate">
              {title}
            </h2>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
