"""
Kyma serverless Function entry point: main(event, context).
Bridges the Bottle request (event.extensions.request) to the FastMCP ASGI app
and returns a bottle.HTTPResponse.
See: https://kyma-project.io/external-content/serverless/docs/user/technical-reference/07-70-function-specification.html
"""
import asyncio
from bottle import HTTPResponse


def main(event, context):
    request = event["extensions"]["request"]
    # Build ASGI scope from Bottle request
    path = request.path or "/"
    query_string = (request.query_string or "").encode()
    headers = [[k.lower().encode(), str(v).encode()] for k, v in request.headers.items()]
    body = request.body.read() if hasattr(request.body, "read") else b""

    scope = {
        "type": "http",
        "method": request.method,
        "path": path,
        "query_string": query_string,
        "headers": headers,
        "http_version": "1.1",
        "scheme": "http",
        "server": ("localhost", 8080),
        "client": ("127.0.0.1", 0),
        "asgi": {"version": "3.0", "spec_version": "2.1"},
    }

    response_status = 500
    response_headers = []
    response_body = []

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        nonlocal response_status, response_headers, response_body
        if message["type"] == "http.response.start":
            response_status = message.get("status", 500)
            response_headers = list(message.get("headers", []))
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    from mcp_oauth import mcp

    asyncio.run(mcp(scope, receive, send))

    out_body = b"".join(response_body)
    out_headers = {k.decode(): v.decode() for k, v in response_headers}
    return HTTPResponse(
        body=out_body,
        status=response_status,
        headers=out_headers,
    )
