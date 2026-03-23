/**
 * Phase 5A: Self Care Service with Offline Support
 * 
 * Wrapper around self care service that queues actions when offline.
 */

import { createNutritionLog as createNutritionLogOriginal, type NutritionLog } from './selfCareService';
import { executeOrQueue } from './offlineUtils';

/**
 * Create a nutrition log, queueing if offline
 */
export async function createNutritionLog(log: Partial<NutritionLog>): Promise<NutritionLog> {
  return await executeOrQueue(
    'create_nutrition_log',
    log as Record<string, unknown>,
    () => createNutritionLogOriginal(log)
  );
}



