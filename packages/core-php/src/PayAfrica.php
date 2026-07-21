<?php

declare(strict_types=1);

namespace PayAfrica\Sdk;

use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\DTO\PaymentEvent;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\DTO\PaymentSession;
use PayAfrica\Sdk\DTO\RefundResult;
use PayAfrica\Sdk\Enums\PaymentStatus;

final class PayAfrica
{
    public function __construct(private readonly PaymentProviderInterface $provider)
    {
    }

    public function initiatePayment(PaymentRequest $params): PaymentSession
    {
        return $this->provider->initiatePayment($params);
    }

    public function checkStatus(string $sessionId): PaymentStatus
    {
        return $this->provider->checkStatus($sessionId);
    }

    /** @param array<string, string|list<string>|null> $headers */
    public function handleWebhook(string $rawBody, array $headers): PaymentEvent
    {
        return $this->provider->handleWebhook($rawBody, $headers);
    }

    public function refund(string $sessionId, ?int $amount = null): RefundResult
    {
        return $this->provider->refund($sessionId, $amount);
    }
}
