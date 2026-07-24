<?php

declare(strict_types=1);

namespace WaslPay\Sdk;

use WaslPay\Sdk\Contracts\PaymentProviderInterface;
use WaslPay\Sdk\DTO\PaymentEvent;
use WaslPay\Sdk\DTO\PaymentRequest;
use WaslPay\Sdk\DTO\PaymentSession;
use WaslPay\Sdk\DTO\PaymentStatusResult;
use WaslPay\Sdk\DTO\RefundResult;

final class WaslPay
{
    public function __construct(private readonly PaymentProviderInterface $provider)
    {
    }

    public function initiatePayment(PaymentRequest $params): PaymentSession
    {
        return $this->provider->initiatePayment($params);
    }

    public function checkStatus(string $sessionId): PaymentStatusResult
    {
        return $this->provider->checkStatus($sessionId);
    }

    /** @param array<string, string|list<string>|null> $headers */
    public function handleWebhook(string $rawBody, array $headers): PaymentEvent
    {
        return $this->provider->handleWebhook($rawBody, $headers);
    }

    public function refund(string $sessionId, int|float|null $amount = null): RefundResult
    {
        return $this->provider->refund($sessionId, $amount);
    }
}
