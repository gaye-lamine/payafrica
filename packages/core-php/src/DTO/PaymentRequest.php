<?php

declare(strict_types=1);

namespace WaslPay\Sdk\DTO;

final class PaymentRequest
{
    /** @param array<string, string> $metadata */
    public function __construct(
        public readonly int $amount,
        public readonly string $currency,
        public readonly string $reference,
        public readonly ?string $customerPhone = null,
        public readonly ?string $successUrl = null,
        public readonly ?string $failureUrl = null,
        public readonly array $metadata = [],
    ) {
    }
}
