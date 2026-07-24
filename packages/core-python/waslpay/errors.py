from __future__ import annotations

from .enums import PaymentError


class ProviderError(Exception):
    def __init__(self, code: PaymentError, message: str) -> None:
        super().__init__(message)
        self.code = code
