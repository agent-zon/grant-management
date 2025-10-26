import { Router, Request, Response } from "express";
import { sessionManager } from "../services/session-manager";
import { authorizationClient } from "../services/authorization-client";
import { config } from "../config";

const router = Router();

/**
 * OAuth callback handler
 * GET /callback?code=xxx&state=yyy&session_id=zzz
 */
router.get("/", async (req: Request, res: Response) => {
  const { code, state, session_id } = req.query;

  console.log(`[Callback] Received callback for session: ${session_id}`);

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Failed</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #1a202c;
            margin: 0 0 0.5rem 0;
          }
          p {
            color: #4a5568;
            margin: 0.5rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Authorization Failed</h1>
          <p>Missing authorization code</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Get base URL for callback
    const protocol = req.protocol;
    const host = req.get("host");
    const redirectUri = `${protocol}://${host}/callback`;

    // Exchange code for token
    const tokenResponse = await authorizationClient.exchangeToken(
      code as string,
      redirectUri
    );

    console.log("[Callback] Token response:", {
      grant_id: tokenResponse.grant_id,
      has_access_token: !!tokenResponse.access_token,
    });

    if (tokenResponse.error) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authorization Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #1a202c;
              margin: 0 0 0.5rem 0;
            }
            p {
              color: #4a5568;
              margin: 0.5rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Authorization Failed</h1>
            <p>${tokenResponse.error}</p>
          </div>
        </body>
        </html>
      `);
    }

    const { grant_id, authorization_details } = tokenResponse;

    // Attach grant to session
    sessionManager.attachGrant(
      session_id as string,
      grant_id,
      authorization_details ? JSON.parse(authorization_details) : []
    );

    console.log(
      `[Callback] Grant ${grant_id} attached to session ${session_id}`
    );

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Successful</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #1a202c;
            margin: 0 0 0.5rem 0;
          }
          p {
            color: #4a5568;
            margin: 0.5rem 0;
          }
          .session-id {
            background: #f7fafc;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-family: monospace;
            margin: 1rem 0;
            font-size: 0.875rem;
          }
          .close-btn {
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          }
          .close-btn:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Authorization Successful!</h1>
          <p>Your MCP tools have been authorized.</p>
          <div class="session-id">
            <strong>Session:</strong> ${session_id}<br/>
            <strong>Grant:</strong> ${grant_id}
          </div>
          <p style="font-size: 0.875rem; color: #718096;">
            You can now close this window and return to your agent.
          </p>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("[Callback] Error in callback handler:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #1a202c;
            margin: 0 0 0.5rem 0;
          }
          p {
            color: #4a5568;
            margin: 0.5rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Internal Server Error</h1>
          <p>${error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </body>
      </html>
    `);
  }
});

export { router as callbackRouter };
