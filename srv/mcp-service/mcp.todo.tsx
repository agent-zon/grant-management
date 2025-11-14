import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from "zod";
import server from "@/mcp-service/mcp.server.tsx";

export default function register(server: McpServer) {

// Add an addition tool
// In-memory task store for playaround
    const tasks: { id: number; title: string; completed: boolean }[] = [];
    let nextTaskId = 1;

// View tasks
    server.registerTool(
        'view-tasks',
        {
            title: 'View Tasks',
            description: 'List all tasks',
            outputSchema: {tasks: z.array(z.object({id: z.number(), title: z.string(), completed: z.boolean()}))}
        },
        async () => {
            return {
                content: [{type: 'text', text: JSON.stringify({tasks})}],
                structuredContent: {tasks}
            };
        }
    );

// Create task
    server.registerTool(
        'create-task',
        {
            title: 'Create Task',
            description: 'Add a new task',
            inputSchema: {title: z.string()},
            outputSchema: {task: z.object({id: z.number(), title: z.string(), completed: z.boolean()})}
        },
        async ({title}) => {
            const task = {id: nextTaskId++, title, completed: false};
            tasks.push(task);
            return {
                content: [{type: 'text', text: JSON.stringify({task})}],
                structuredContent: {task}
            };
        }
    );

// Complete task
    server.registerTool(
        'complete-task',
        {
            title: 'Complete Task',
            description: 'Mark a task as completed',
            inputSchema: {id: z.number()},
            outputSchema: {success: z.boolean()}
        },
        async ({id}) => {
            const task = tasks.find(t => t.id === id);
            if (task) task.completed = true;
            return {
                content: [{type: 'text', text: JSON.stringify({success: !!task})}],
                structuredContent: {success: !!task}
            };
        }
    );
}