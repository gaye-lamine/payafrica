<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Contracts;

use PayAfrica\Sdk\DTO\PaymentEvent;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\DTO\PaymentSession;
use PayAfrica\Sdk\DTO\PaymentStatusResult;
use PayAfrica\Sdk\DTO\RefundResult;

interface PaymentProviderInterface
{
    public function initiatePayment(PaymentRequest $params): PaymentSession;

    public function checkStatus(string $sessionId): PaymentStatusResult;

    /** @param array<string, string|list<string>|null> $headers */
    public function handleWebhook(string $rawBody, array $headers): PaymentEvent;

    public function refund(string $sessionId, int|float|null $amount = null): RefundResult;
}
