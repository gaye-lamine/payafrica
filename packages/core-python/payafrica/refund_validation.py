from __future__ import annotations

import sys
from collections.abc import Callable

from .enums import PaymentError
from .errors import ProviderError


def validate_refund_amount(
    amount: int | float,
    create_error: Callable[[PaymentError, str], ProviderError],
) -> int:
    if (
        isinstance(amount, bool)
        or not isinstance(amount, int)
        or amount <= 0
        or amount > sys.maxsize
    ):
        raise create_error(
            PaymentError.INVALID_REFUND_AMOUNT,
            "Refund amount must be a positive safe integer in minor currency units",
        )
    return amount
