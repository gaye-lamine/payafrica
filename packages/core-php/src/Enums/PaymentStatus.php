<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Success = 'success';
    case Failed = 'failed';
    case Expired = 'expired';
}
