// Custom logo and branding for Agent Grants platform

interface WelcomeProps {
  nodeVersion: string;
}

export function Welcome({ nodeVersion }: WelcomeProps) {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Custom Grant Management Logo */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="7" r="2" fill="currentColor" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      <circle cx="12" cy="17" r="2" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                    >
                      <path
                        d="M9 12l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Agent Grants
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Security Platform
                  </p>
                </div>
              </div>

              {/* SAP AI Security Cloud Badge */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full border border-blue-200 dark:border-blue-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  SAP AI Security Cloud
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-[400px] w-full space-y-6 px-4">
          <nav className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Grant Management for Agents
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User Portal
              </p>
              <div className="flex items-center justify-center space-x-2 mt-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  SAP AI Security Cloud
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                Secure AI agent permission management with consent-aware access
                control
              </p>
            </div>
            <ul className="space-y-2">
              {resources.map(({ href, text, icon, description }) => (
                <li key={href}>
                  <a
                    className="group flex items-center gap-3 self-stretch p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-gray-600 shadow-sm group-hover:shadow-md transition-shadow">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {text}
                      </p>
                      {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-gray-400 group-hover:text-blue-500 transition-colors"
                    >
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer Information */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>System Online</span>
              </span>
              <span>•</span>
              <span>v2.1.0</span>
              <span>•</span>
              <span>Node {nodeVersion}</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Enterprise-grade AI agent security and compliance platform
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const resources = [
  {
    href: "/grants",
    text: "Grant Management",
    description: "Manage AI agent permissions and access controls",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
        <path d="M13 12h3a2 2 0 0 1 2 2v1" />
        <path d="M13 12h-3a2 2 0 0 0-2 2v1" />
      </svg>
    ),
  },
  {
    href: "/vault",
    text: "Grant Vault",
    description: "Audit trail and compliance monitoring",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <circle cx="12" cy="16" r="1" />
        <path d="m7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    href: "/chat",
    text: "AI Chat Assistant",
    description: "Consent-aware conversational interface",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </svg>
    ),
  },
];
