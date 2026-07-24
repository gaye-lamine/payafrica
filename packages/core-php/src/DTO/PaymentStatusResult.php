<?php

declare(strict_types=1);

namespace WaslPay\Sdk\DTO;

use InvalidArgumentException;
use WaslPay\Sdk\Enums\PaymentError;
use WaslPay\Sdk\Enums\PaymentStatus;

final class PaymentStatusResult
{
    public function __construct(
        public readonly PaymentStatus $status,
        public readonly ?PaymentError $error = null,
    ) {
        if ($status === PaymentStatus::Failed && $error === null) {
            throw new InvalidArgumentException('A failed payment status requires a PaymentError.');
        }

        if ($status !== PaymentStatus::Failed && $error !== null) {
            throw new InvalidArgumentException('Only a failed payment status may include a PaymentError.');
        }
    }
}
