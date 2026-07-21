from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx

from ..contracts import PaymentProvider, WebhookHeaders
from ..enums import PaymentError, PaymentStatus
from ..errors import ProviderError
from ..models import PaymentEvent, PaymentRequest, PaymentSession, RefundResult


class WaveProvider(PaymentProvider):
    _BASE_URL = "https://api.wave.com/v1"

    def __init__(self, client: httpx.AsyncClient, api_key: str, webhook_secret: str) -> None:
        self._client, self._api_key, self._webhook_secret = client, api_key, webhook_secret

    async def initiate_payment(self, params: PaymentRequest) -> PaymentSession:
        payload = await self._request("POST", "/checkout/sessions", json={"amount": params.amount, "currency": "XOF", "error_url": params.failure_url, "success_url": params.success_url, "client_reference": params.reference})
        session_id = payload.get("id")
        if not isinstance(session_id, str): raise ProviderError(PaymentError.UNKNOWN, "Wave checkout response is missing id")
        return PaymentSession(id=session_id, reference=params.reference, amount=params.amount, currency=params.currency, status=PaymentStatus.PENDING, payment_url=payload.get("wave_launch_url") if isinstance(payload.get("wave_launch_url"), str) else None)

    async def check_status(self, session_id: str) -> PaymentStatus:
        return self._status((await self._request("GET", f"/checkout/sessions/{session_id}" )).get("payment_status"))

    async def handle_webhook(self, raw_body: str | bytes, headers: WebhookHeaders) -> PaymentEvent:
        raw = raw_body.encode() if isinstance(raw_body, str) else raw_body
        signature = self._header(headers, "x-wave-signature")
        expected = hmac.new(self._webhook_secret.encode(), raw, hashlib.sha256).hexdigest()
        candidates = [part.strip().removeprefix("v1=") for part in signature.split(",")] if signature else []
        if not any(hmac.compare_digest(expected, candidate) for candidate in candidates): raise ProviderError(PaymentError.UNKNOWN, "Invalid Wave webhook signature")
        payload = self._decode(raw); data = payload.get("data")
        if not isinstance(data, dict) or not isinstance(data.get("id"), str): raise ProviderError(PaymentError.UNKNOWN, "Incomplete Wave webhook payload")
        event_type = payload.get("type"); status = PaymentStatus.SUCCESS if event_type == "checkout.session.completed" else PaymentStatus.FAILED if event_type == "checkout.session.payment_failed" else self._status(data.get("payment_status"))
        return PaymentEvent(id=str(payload.get("id", data["id"])), session_id=data["id"], status=status, occurred_at=str(data.get("when_completed", data.get("when_created", "1970-01-01T00:00:00Z"))), reference=data.get("client_reference") if isinstance(data.get("client_reference"), str) else None)

    async def refund(self, session_id: str, amount: int | None = None) -> RefundResult:
        payload = await self._request("POST", f"/checkout/sessions/{session_id}/refund", json={} if amount is None else {"amount": amount})
        refund_id, refund_amount = payload.get("id"), payload.get("amount")
        if not isinstance(refund_id, str) or not isinstance(refund_amount, int): raise ProviderError(PaymentError.UNKNOWN, "Incomplete Wave refund response")
        return RefundResult(session_id=session_id, refund_id=refund_id, amount=refund_amount, status=self._status(payload.get("status", "succeeded")))

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        try: response = await self._client.request(method, self._BASE_URL + path, headers={"Authorization": f"Bearer {self._api_key}"}, **kwargs)
        except httpx.HTTPError as exc: raise ProviderError(PaymentError.PROVIDER_TIMEOUT, str(exc)) from exc
        payload = response.json() if response.content else {}; payload = payload if isinstance(payload, dict) else {}
        if response.is_error:
            code = str(payload.get("error_code", "")); error = PaymentError.INSUFFICIENT_FUNDS if code == "insufficient-funds" else PaymentError.INVALID_PHONE if code in {"payer-mobile-mismatch", "invalid-phone"} else PaymentError.PROVIDER_TIMEOUT if response.status_code >= 500 or response.status_code == 408 else PaymentError.UNKNOWN
            raise ProviderError(error, str(payload.get("error_message", "Wave request failed")))
        return payload

    @staticmethod
    def _status(status: object) -> PaymentStatus:
        return {"succeeded": PaymentStatus.SUCCESS, "success": PaymentStatus.SUCCESS, "processing": PaymentStatus.PENDING, "pending": PaymentStatus.PENDING, "cancelled": PaymentStatus.FAILED, "failed": PaymentStatus.FAILED}.get(str(status).lower(), PaymentStatus.FAILED)

    @staticmethod
    def _decode(raw: bytes) -> dict[str, Any]:
        payload = json.loads(raw)
        if not isinstance(payload, dict): raise ProviderError(PaymentError.UNKNOWN, "Invalid Wave webhook payload")
        return payload

    @staticmethod
    def _header(headers: WebhookHeaders, name: str) -> str | None:
        return next((value for key, value in headers.items() if key.lower() == name and isinstance(value, str)), None)
