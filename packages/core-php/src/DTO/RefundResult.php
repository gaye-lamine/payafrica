<?php

declare(strict_types=1);

namespace WaslPay\Sdk\DTO;

use WaslPay\Sdk\Enums\PaymentStatus;

final class RefundResult
{
    public function __construct(
        public readonly string $sessionId,
        public readonly string $refundId,
        public readonly int $amount,
        public readonly PaymentStatus $status,
    ) {
    }
}
