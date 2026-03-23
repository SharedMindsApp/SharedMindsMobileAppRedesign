/**
 * Phase 5A: Todos Service with Offline Support
 * 
 * Wrapper around todos service that queues actions when offline.
 */

import { createTodo as createTodoOriginal, type CreateTodoParams, type PersonalTodo } from './todosService';
import { executeOrQueue } from './offlineUtils';

/**
 * Create a todo, queueing if offline
 */
export async function createTodo(params: CreateTodoParams): Promise<PersonalTodo> {
  return await executeOrQueue(
    'create_todo',
    params as Record<string, unknown>,
    () => createTodoOriginal(params)
  );
}



