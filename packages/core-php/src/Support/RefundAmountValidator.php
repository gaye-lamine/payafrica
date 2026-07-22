<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Support;

use PayAfrica\Sdk\Enums\PaymentError;

final class RefundAmountValidator
{
    /** @param callable(PaymentError, string): \Throwable $createError */
    public static function validate(int|float $amount, callable $createError): int
    {
        if (!is_int($amount) || $amount <= 0) {
            throw $createError(
                PaymentError::InvalidRefundAmount,
                'Refund amount must be a positive safe integer in minor currency units',
            );
        }

        return $amount;
    }
}
