from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Mapping, Sequence

from .enums import PaymentStatus
from .models import PaymentEvent, PaymentRequest, PaymentSession, RefundResult

WebhookHeaders = Mapping[str, str | Sequence[str] | None]


class PaymentProvider(ABC):
    @abstractmethod
    async def initiate_payment(self, params: PaymentRequest) -> PaymentSession: ...

    @abstractmethod
    async def check_status(self, session_id: str) -> PaymentStatus: ...

    @abstractmethod
    async def handle_webhook(self, raw_body: str | bytes, headers: WebhookHeaders) -> PaymentEvent: ...

    @abstractmethod
    async def refund(self, session_id: str, amount: int | None = None) -> RefundResult: ...
