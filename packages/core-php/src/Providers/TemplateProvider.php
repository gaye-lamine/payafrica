<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Providers;

use LogicException;
use WaslPay\Sdk\Contracts\PaymentProviderInterface;
use WaslPay\Sdk\DTO\PaymentEvent;
use WaslPay\Sdk\DTO\PaymentRequest;
use WaslPay\Sdk\DTO\PaymentSession;
use WaslPay\Sdk\DTO\PaymentStatusResult;
use WaslPay\Sdk\DTO\RefundResult;

final class TemplateProvider implements PaymentProviderInterface
{
    public function initiatePayment(PaymentRequest $params): PaymentSession
    {
        // TODO: Create the provider payment request and normalize its session.
        throw new LogicException('Not implemented');
    }

    public function checkStatus(string $sessionId): PaymentStatusResult
    {
        // TODO: Fetch and normalize the provider payment status.
        throw new LogicException('Not implemented');
    }

    public function handleWebhook(string $rawBody, array $headers): PaymentEvent
    {
        // TODO: Verify the provider security header before parsing the raw body.
        throw new LogicException('Not implemented');
    }

    public function refund(string $sessionId, int|float|null $amount = null): RefundResult
    {
        // TODO: Request a full or partial refund and normalize the result.
        throw new LogicException('Not implemented');
    }
}
