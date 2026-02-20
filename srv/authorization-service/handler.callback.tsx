import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import { render } from "#cds-ssr";
export default async function callback(
  this: AuthorizationService,
  req: cds.Request<{ grant_id?: string }>
) {
  console.log("🔐 Callback action:", req.data);

  const { grant_id } = req.data;
  render(
    req,
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="p-5 rounded-full bg-green-100 border-2 border-green-200">
                <div className="text-5xl">✓</div>
              </div>
            </div>

            {/* Main Message */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Permission Approved Successfully
              </h1>
              <p className="text-gray-600 text-lg">
                Your permission request has been approved and is now active.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <a
                href={
                  grant_id
                    ? `/grants-management/Grants/${grant_id}`
                    : "/grants-management/Grants"
                }
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                {grant_id ? "View This Permission" : "View Your Permissions"}
              </a>
              <a
                href="/grants-management/Grants"
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-semibold"
              >
                View All Permissions
              </a>
            </div>

            {/* Close Window Message */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                You can safely close this window now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
