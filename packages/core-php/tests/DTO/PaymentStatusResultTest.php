<?php

declare(strict_types=1);

namespace WaslPay\Sdk\Tests\DTO;

use InvalidArgumentException;
use WaslPay\Sdk\DTO\PaymentStatusResult;
use WaslPay\Sdk\Enums\PaymentError;
use WaslPay\Sdk\Enums\PaymentStatus;
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
