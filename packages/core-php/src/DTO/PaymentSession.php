<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\DTO;

use PayAfrica\Sdk\Enums\PaymentStatus;

final class PaymentSession
{
    public function __construct(
        public readonly string $id,
        public readonly string $reference,
        public readonly int $amount,
        public readonly string $currency,
        public readonly PaymentStatus $status,
        public readonly ?string $paymentUrl = null,
        public readonly ?string $expiresAt = null,
    ) {
    }
}
