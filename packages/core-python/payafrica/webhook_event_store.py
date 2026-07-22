from __future__ import annotations

from collections.abc import Callable
from typing import Protocol

from .models import PaymentEvent


class WebhookEventStore(Protocol):
    """Runs business processing once for each normalized webhook event id."""

    def process(self, event: PaymentEvent, process_first_delivery: Callable[[PaymentEvent], PaymentEvent]) -> PaymentEvent: ...


class InMemoryWebhookEventStore:
    """Development/test-only store; inject durable storage in production."""

    def __init__(self) -> None:
        self._events: dict[str, PaymentEvent] = {}

    def process(self, event: PaymentEvent, process_first_delivery: Callable[[PaymentEvent], PaymentEvent]) -> PaymentEvent:
        existing = self._events.get(event.id)
        if existing is not None:
            return existing

        processed_event = process_first_delivery(event)
        self._events[event.id] = processed_event
        return processed_event
