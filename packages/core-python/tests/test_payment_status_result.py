from __future__ import annotations

import pytest
from pydantic import ValidationError

from waslpay.enums import PaymentError, PaymentStatus
from waslpay.models import PaymentStatusResult


def test_failed_status_without_error_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PaymentStatusResult(status=PaymentStatus.FAILED)


def test_non_failed_status_with_error_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PaymentStatusResult(
            status=PaymentStatus.SUCCESS,
            error=PaymentError.UNKNOWN,
        )
