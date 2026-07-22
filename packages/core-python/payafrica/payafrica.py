from __future__ import annotations

from .contracts import PaymentProvider, WebhookHeaders
from .models import PaymentEvent, PaymentRequest, PaymentSession, PaymentStatusResult, RefundResult


class PayAfrica:
    def __init__(self, provider: PaymentProvider) -> None:
        self._provider = provider

    async def initiate_payment(self, params: PaymentRequest) -> PaymentSession:
        return await self._provider.initiate_payment(params)

    async def check_status(self, session_id: str) -> PaymentStatusResult:
        return await self._provider.check_status(session_id)

    async def handle_webhook(self, raw_body: str | bytes, headers: WebhookHeaders) -> PaymentEvent:
        return await self._provider.handle_webhook(raw_body, headers)

    async def refund(self, session_id: str, amount: int | float | None = None) -> RefundResult:
        return await self._provider.refund(session_id, amount)
