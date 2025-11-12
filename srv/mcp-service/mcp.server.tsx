import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from "zod"
const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0'
});


// Add an addition tool
server.registerTool(
    'add',
    {
        title: 'Addition Tool',
        description: 'Add two numbers',
    },
    async () => {
        return {
            content: [{ type: 'text', text: "hi"}],
        };
    }
);

server.registerTool(
    'calculate-bmi',
    {
        title: 'BMI Calculator',
        description: 'Calculate Body Mass Index',
        inputSchema: {
            weightKg: z.number(),
            heightM: z.number()
        },
        outputSchema: { bmi: z.number() }
    },
    async ({ weightKg, heightM }) => {
        const output = { bmi: weightKg / (heightM * heightM) };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(output)
                }
            ],
            structuredContent: output
        };
    }
);
// Add a dynamic greeting resource
server.registerResource(
    'greeting',
    new ResourceTemplate('greeting://{name}', { list: undefined }),
    {
        title: 'Greeting Resource', // Display name for UI
        description: 'Dynamic greeting generator'
    },
    async (uri, { name }) => ({
        contents: [
            {
                uri: uri.href,
                text: `Hello, ${name}!`
            }
        ]
    })
);

export default server;