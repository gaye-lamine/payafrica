<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Exceptions;

use PayAfrica\Sdk\Enums\PaymentError;
use RuntimeException;

final class ProviderException extends RuntimeException
{
    public function __construct(public readonly PaymentError $paymentError, string $message)
    {
        parent::__construct($message);
    }
}
