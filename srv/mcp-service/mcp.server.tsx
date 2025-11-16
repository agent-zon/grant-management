import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from "zod"
import grant from "@/mcp-service/mcp.grant.tsx";
import todo from "@/mcp-service/mcp.todo.tsx";

const server = new McpServer({
    name: 'mcp-todo-service',
    title: 'MCP To-Do Service',
    description: 'A simple To-Do service implemented with MCP',
    version: '1.0.0'
});


todo(server);
grant(server);

export default server;