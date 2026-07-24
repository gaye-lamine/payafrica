<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Exceptions;

use WaslPay\Sdk\Enums\PaymentError;
use RuntimeException;

final class ProviderException extends RuntimeException
{
    public function __construct(public readonly PaymentError $paymentError, string $message)
    {
        parent::__construct($message);
    }
}
