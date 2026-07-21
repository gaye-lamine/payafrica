from __future__ import annotations

from enum import Enum

try:
    from enum import StrEnum
except ImportError:  # Python 3.10 compatibility
    class StrEnum(str, Enum):
        pass


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    EXPIRED = "expired"


class PaymentError(StrEnum):
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
    INVALID_PHONE = "INVALID_PHONE"
    USER_CANCELLED = "USER_CANCELLED"
    UNKNOWN = "UNKNOWN"
