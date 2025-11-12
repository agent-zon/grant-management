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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="text-4xl">✅</div>
              </div>
            </div>

            {/* Main Message */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Authorization Successful
              </h1>
              <p className="text-gray-300 text-lg">
                Your consent has been granted successfully.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a
                href={
                  grant_id
                    ? `/grants-management/Grants/${grant_id}`
                    : "/grants-management/Grants"
                }
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {grant_id ? "View This Grant" : "View Your Grants"}
              </a>
              <a
                href="/grants-management/Grants"
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                View All Grants
              </a>
            </div>

            {/* Close Window Message */}
            <div className="pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                You can safely close this window now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
