import cds from "@sap/cds";
import { render } from "#cds-ssr";




export default async function Authentication(req: cds.Request, next) {
    req.data = {
        BasicAuthentication,
        OAuth2ClientCredentials,
        OAuth2SAMLBearerAssertion,
        OAuth2Password,
        ClientCertificateAuthentication
    }

    await next()

}

export async function BasicAuthentication(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Basic auth</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs text-gray-500 mb-1.5" >
                    <input
                        name="username"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                        placeholder="user-name"
                    />
                </label>
                <label className="block text-xs text-gray-500 mb-1.5" >
                    <input
                        name="password"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                        placeholder="••••••••"
                    />
                </label>
            </div>
        </div>
    </div>
    )
}

export async function OAuth2ClientCredentials(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Token service</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs text-gray-500 mb-1.5" >
                Token Service URL
                <input
                    name="tokenServiceUrl"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="https://.../oauth/token"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Client ID
                <input
                    name="clientId"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Client Secret
                <input
                    name="clientSecret"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Token Service User (optional)
                <input
                    name="tokenServiceUser"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="user"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Token Service Password
                <input
                    name="tokenServicePassword"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>

        </div>
    </div>
    )
}

export function OAuth2SAMLBearerAssertion(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">SAML Bearer</p>
        <div>
            <label className="block text-xs text-gray-500 mb-1.5" >
                <input
                    name="systemUser"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="system-user"
                />
            </label>

        </div>
    </div>
    )

}

export function OAuth2JWTBearer(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">JWT Bearer</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs text-gray-500 mb-1.5" >
                Token Service URL
                <input
                    name="tokenServiceUrl"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="https://.../oauth/token"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Client ID
                <input
                    name="clientId"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                Client Secret
                <input
                    name="clientSecret"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
        </div>
    </div>
    )
}

export function OAuth2Password(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">OAuth2 Password</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs text-gray-500 mb-1.5" >
                Token Service URL
                <input
                    name="tokenServiceUrl"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="https://.../oauth/token"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                <input
                    name="username"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="user-name"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                <input
                    name="password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
        </div>
    </div>
    );
}

export function ClientCertificateAuthentication(req: cds.Request) {
    return render(req, <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Client certificate</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-xs text-gray-500 mb-1.5" >
                <input
                    name="keyStoreName"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="key-store-name"
                />
            </label>
            <label className="block text-xs text-gray-500 mb-1.5" >
                <input
                    name="keyStorePassword"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                    placeholder="••••••••"
                />
            </label>
        </div>
    </div>)
}

