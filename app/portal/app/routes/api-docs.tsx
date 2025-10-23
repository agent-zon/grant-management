import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowLeft, Book } from "lucide-react";
import type { Route } from "./+types/api-docs";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "API Documentation - Agent Grants" },
    {
      name: "description",
      content: "Interactive OpenAPI documentation for Agent Grants services",
    },
  ];
}

export function loader() {
  return {
    services: [
      {
        id: "grants",
        name: "Grants Management Service",
        description: "OAuth 2.0 Grant Management API",
        spec: "GrantsManagementService.openapi3.json",
      },
      {
        id: "authorization",
        name: "Authorization Service",
        description: "OAuth 2.0 Authorization Server",
        spec: "AuthorizationService.openapi3.json",
      },
      {
        id: "auth",
        name: "Auth Service",
        description: "Authentication and user information",
        spec: "AuthService.openapi3.json",
      },
      {
        id: "demo",
        name: "Demo Service",
        description: "Demo and testing endpoints",
        spec: "DemoService.openapi3.json",
      },
    ],
  };
}

export default function ApiDocs({ loaderData }: Route.ComponentProps) {
  const { services } = loaderData;
  const apiReferenceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isDev = typeof window !== "undefined" && window.location.port === "5173";
    const baseUrl = isDev ? "/openapi" : "/resources/openapi";
    
    const loadScalar = async () => {
      try {
        const defaultService = services[0];
        const specUrl = `${baseUrl}/${defaultService.spec}`;
        
        if (apiReferenceRef.current) {
          apiReferenceRef.current.innerHTML = "";
          
          // Load Scalar's standalone bundle via CDN
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
          script.async = true;
          script.onload = () => {
            // After script loads, initialize Scalar
            if (apiReferenceRef.current) {
              apiReferenceRef.current.innerHTML = `
                <script
                  id="api-reference"
                  data-url="${specUrl}"
                ></script>
              `;
            }
          };
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error("Failed to load Scalar API Reference:", error);
        if (apiReferenceRef.current) {
          apiReferenceRef.current.innerHTML = `
            <div class="p-8 text-center">
              <p class="text-red-400">Failed to load API documentation.</p>
              <p class="text-gray-400 mt-2">Error: ${error}</p>
            </div>
          `;
        }
      }
    };
    
    loadScalar();
  }, [services]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 transition-colors mb-4 inline-block"
          >
            <div className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">API Documentation</h1>
          <p className="text-gray-400">
            Interactive OpenAPI documentation for Agent Grants services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Book className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-white">
                  {service.name}
                </h3>
              </div>
              <p className="text-xs text-gray-400">{service.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div
            ref={apiReferenceRef}
            className="min-h-[600px]"
            style={{
              width: "100%",
              height: "calc(100vh - 300px)",
            }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading API documentation...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Book className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-400">
                About API Documentation
              </h4>
              <p className="text-xs text-blue-300 mt-1">
                This documentation is automatically generated from the CDS service
                definitions using OpenAPI 3.0 specification. You can test API
                endpoints directly from this interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

