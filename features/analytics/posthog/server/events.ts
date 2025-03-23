/**
 * DISABLED - SERVER SIDE CUSTOM EVENTS
 * This file is temporarily disabled to allow client-side testing
 */

import { EventCategory } from "../client/events";
import { trackServerEvent } from "./utils";

// All server-side exports are disabled

// Re-enable this file later by renaming to server-events.ts and uncommenting the code below

/*
import 'server-only';
import { trackServerEvent } from './utils';
import { EventCategory } from '../client/events';

/**
 * Track an event on the server side with category and action
 */
export async function trackServerAction(
  userId: string,
  action: string,
  category: string = EventCategory.SYSTEM,
  properties?: Record<string, string | number | boolean | null>,
): Promise<void> {
  await trackServerEvent(userId, `${category}_${action}`, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track a form submission on the server side
 */
export async function trackServerFormSubmit(
  userId: string,
  formId: string,
  success: boolean = true,
  formName?: string,
  errorDetails?: string,
): Promise<void> {
  await trackServerEvent(userId, `${EventCategory.FORM}_submit`, {
    form_id: formId,
    form_name: formName || null,
    success,
    error_details: errorDetails || null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track an API call on the server side
 */
export async function trackServerApiCall(
  userId: string,
  endpoint: string,
  method: string,
  success: boolean,
  durationMs?: number,
  statusCode?: number,
  errorMessage?: string,
): Promise<void> {
  await trackServerEvent(userId, `${EventCategory.API}_call`, {
    endpoint,
    method,
    success,
    duration_ms: durationMs || null,
    status_code: statusCode || null,
    error_message: errorMessage || null,
    timestamp: new Date().toISOString(),
  });
}
