<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Enums;

enum PaymentError: string
{
    case InsufficientFunds = 'INSUFFICIENT_FUNDS';
    case ProviderTimeout = 'PROVIDER_TIMEOUT';
    case InvalidPhone = 'INVALID_PHONE';
    case InvalidRefundAmount = 'INVALID_REFUND_AMOUNT';
    case RefundAmountExceedsBalance = 'REFUND_AMOUNT_EXCEEDS_BALANCE';
    case UserCancelled = 'USER_CANCELLED';
    case Unknown = 'UNKNOWN';
}
