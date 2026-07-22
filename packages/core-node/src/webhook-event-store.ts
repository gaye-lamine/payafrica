import type { PaymentEvent } from "./types.js";

/**
 * Stores a webhook event exactly once and returns the canonical stored event.
 * Implementations may back this contract with a database or distributed cache.
 */
export interface WebhookEventStore {
  record(event: PaymentEvent): PaymentEvent;
}

/** In-memory store intended for local development and tests. */
export class InMemoryWebhookEventStore implements WebhookEventStore {
  private readonly events = new Map<string, PaymentEvent>();

  public record(event: PaymentEvent): PaymentEvent {
    const existingEvent = this.events.get(event.id);
    if (existingEvent !== undefined) return existingEvent;

    this.events.set(event.id, event);
    return event;
  }

  public get size(): number {
    return this.events.size;
  }
}
