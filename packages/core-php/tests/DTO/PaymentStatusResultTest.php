<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\DTO;

use InvalidArgumentException;
use PayAfrica\Sdk\DTO\PaymentStatusResult;
use PayAfrica\Sdk\Enums\PaymentError;
use PayAfrica\Sdk\Enums\PaymentStatus;
use PHPUnit\Framework\TestCase;

final class PaymentStatusResultTest extends TestCase
{
    public function testFailedStatusWithoutErrorIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new PaymentStatusResult(PaymentStatus::Failed);
    }

    public function testNonFailedStatusWithErrorIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new PaymentStatusResult(PaymentStatus::Success, PaymentError::Unknown);
    }
}
