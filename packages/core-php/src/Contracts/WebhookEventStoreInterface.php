<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Contracts;

use PayAfrica\Sdk\DTO\PaymentEvent;

interface WebhookEventStoreInterface
{
    /**
     * Executes the business-processing callback only for the first delivery of
     * an event id, then returns the canonical stored event for every delivery.
     *
     * @param callable(PaymentEvent): PaymentEvent $processFirstDelivery
     */
    public function process(PaymentEvent $event, callable $processFirstDelivery): PaymentEvent;
}
