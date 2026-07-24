<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Tests\Contract;

use WaslPay\Sdk\Contracts\WebhookEventStoreInterface;
use WaslPay\Sdk\DTO\PaymentEvent;

final class SpyWebhookEventStore implements WebhookEventStoreInterface
{
    /** @var array<string, PaymentEvent> */
    private array $events = [];
    public int $businessProcessCalls = 0;

    public function process(PaymentEvent $event, callable $processFirstDelivery): PaymentEvent
    {
        if (isset($this->events[$event->id])) {
            return $this->events[$event->id];
        }

        ++$this->businessProcessCalls;
        $processedEvent = $processFirstDelivery($event);
        $this->events[$event->id] = $processedEvent;

        return $processedEvent;
    }
}
