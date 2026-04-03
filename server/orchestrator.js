/**
 * Orchestrator — drives tasks through the agent pipeline.
 * CEO → PM → Analyst → Tech Lead → Developer → QA → Tech Lead → CEO
 * Each step calls the LLM with the agent's system prompt and accumulated context.
 */

import { v4 as uuidv4 } from 'uuid';
import { AGENTS, WORKFLOW_PIPELINE } from './agents.js';
import { callLLM } from './llm.js';
import { sanitizeOutput } from './filter.js';

/** @type {Map<string, TaskState>} */
const activeTasks = new Map();

/**
 * @typedef {Object} TaskState
 * @property {string} id
 * @property {string} input - original user input
 * @property {string} status - queued|processing|completed|failed
 * @property {number} currentStep
 * @property {Array} messages - conversation log between agents
 * @property {string|null} result
 * @property {string|null} walletAddress - connected wallet
 * @property {number} createdAt
 * @property {number} updatedAt
 */

export function createTask(input, walletAddress = null) {
  const task = {
    id: uuidv4(),
    input,
    status: 'queued',
    currentStep: 0,
    messages: [],
    result: null,
    walletAddress,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  activeTasks.set(task.id, task);
  return task;
}

export function getTask(taskId) {
  return activeTasks.get(taskId) || null;
}

export function getAllTasks() {
  return Array.from(activeTasks.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}

/**
 * Process a task through the full agent pipeline.
 * Emits real-time updates via the provided emit callback.
 * @param {string} taskId
 * @param {(event: string, data: any) => void} emit - Socket.IO emit function
 */
export async function processTask(taskId, emit) {
  const task = activeTasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.status = 'processing';
  task.updatedAt = Date.now();
  emit('task:status', { taskId, status: 'processing' });

  try {
    for (let step = 0; step < WORKFLOW_PIPELINE.length; step++) {
      const agentId = WORKFLOW_PIPELINE[step];
      const agent = AGENTS[agentId];
      task.currentStep = step;
      task.updatedAt = Date.now();

      emit('task:agent_start', {
        taskId,
        step,
        agentId,
        agentName: agent.name,
        agentRole: agent.role,
      });

      // Agent "walks to desk" delay — 3 seconds
      await sleep(3000);

      // Build conversation context for this agent
      const llmMessages = buildAgentContext(task, agent, step);

      // Call LLM
      const response = await callLLM(agent.systemPrompt, llmMessages);

      // Parse agent response — extract just the message text
      let displayMessage = response;
      try {
        // Try to extract JSON from response (may be wrapped in markdown)
        const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) {
            displayMessage = parsed.message;
          }
        }
      } catch {
        // If JSON parsing fails, use raw response but strip any JSON-looking parts
        displayMessage = response.replace(/\{[\s\S]*\}/, '').trim() || response;
      }

      const agentMessage = {
        step,
        agentId,
        agentName: agent.name,
        agentRole: agent.role,
        message: sanitizeOutput(displayMessage),
        action: 'continue',
        data: {},
        timestamp: Date.now(),
      };

      task.messages.push(agentMessage);

      emit('task:agent_response', {
        taskId,
        ...agentMessage,
      });

      // Agent "working" delay — 7 more seconds (total ~10s per agent)
      await sleep(7000);
    }

    // Final result is the last CEO message
    const lastCeoMsg = task.messages.filter(m => m.agentId === 'ceo').pop();
    task.result = lastCeoMsg?.message || 'Task completed';
    task.status = 'completed';
    task.updatedAt = Date.now();

    emit('task:completed', {
      taskId,
      result: task.result,
      messages: task.messages,
    });
  } catch (error) {
    task.status = 'failed';
    task.result = `Error: ${error.message}`;
    task.updatedAt = Date.now();

    emit('task:failed', {
      taskId,
      error: error.message,
    });
  }

  return task;
}

function buildAgentContext(task, agent, step) {
  const messages = [];

  // First agent (CEO) gets the raw user input
  if (step === 0) {
    messages.push({
      role: 'user',
      content: `New task from the client:\n\n"${task.input}"\n\nAnalyze the task and delegate it to the PM. Respond in the specified JSON format.`,
    });
  } else {
    // Subsequent agents get the accumulated context
    const previousMessages = task.messages.slice(0, step);
    const context = previousMessages
      .map(m => `[${m.agentRole} — ${m.agentName}]: ${m.message}`)
      .join('\n\n');

    const prevAgent = task.messages[step - 1];
    messages.push({
      role: 'user',
      content: `Task context from the client: "${task.input}"\n\nTeam discussion history:\n${context}\n\nLast message from ${prevAgent?.agentRole} (${prevAgent?.agentName}):\n${prevAgent?.message}\n\nNow it's your turn. Perform your role and respond in the specified JSON format.`,
    });
  }

  return messages;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
