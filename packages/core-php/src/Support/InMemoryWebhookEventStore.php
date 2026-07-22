<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Support;

use PayAfrica\Sdk\Contracts\WebhookEventStoreInterface;
use PayAfrica\Sdk\DTO\PaymentEvent;

final class InMemoryWebhookEventStore implements WebhookEventStoreInterface
{
    /** @var array<string, PaymentEvent> */
    private array $events = [];

    public function process(PaymentEvent $event, callable $processFirstDelivery): PaymentEvent
    {
        if (isset($this->events[$event->id])) {
            return $this->events[$event->id];
        }

        $processedEvent = $processFirstDelivery($event);
        $this->events[$event->id] = $processedEvent;

        return $processedEvent;
    }
}
