<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Support;

use WaslPay\Sdk\Contracts\WebhookEventStoreInterface;
use WaslPay\Sdk\DTO\PaymentEvent;

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
