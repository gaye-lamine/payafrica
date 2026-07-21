<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\DTO;

use PayAfrica\Sdk\Enums\PaymentError;
use PayAfrica\Sdk\Enums\PaymentStatus;

final class PaymentEvent
{
    public function __construct(
        public readonly string $id,
        public readonly string $sessionId,
        public readonly PaymentStatus $status,
        public readonly string $occurredAt,
        public readonly ?string $reference = null,
        public readonly ?PaymentError $error = null,
    ) {
    }
}
