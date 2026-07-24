<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Contracts;

use WaslPay\Sdk\DTO\PaymentEvent;
use WaslPay\Sdk\DTO\PaymentRequest;
use WaslPay\Sdk\DTO\PaymentSession;
use WaslPay\Sdk\DTO\PaymentStatusResult;
use WaslPay\Sdk\DTO\RefundResult;

interface PaymentProviderInterface
{
    public function initiatePayment(PaymentRequest $params): PaymentSession;

    public function checkStatus(string $sessionId): PaymentStatusResult;

    /** @param array<string, string|list<string>|null> $headers */
    public function handleWebhook(string $rawBody, array $headers): PaymentEvent;

    public function refund(string $sessionId, int|float|null $amount = null): RefundResult;
}
