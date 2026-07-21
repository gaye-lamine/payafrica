from __future__ import annotations

import base64
import json
import time
import uuid
from typing import Any

import httpx

from ..contracts import PaymentProvider, WebhookHeaders
from ..enums import PaymentError, PaymentStatus
from ..errors import ProviderError
from ..models import PaymentEvent, PaymentRequest, PaymentSession, RefundResult


class MtnMomoProvider(PaymentProvider):
    _BASE_URLS = {"sandbox": "https://sandbox.momodeveloper.mtn.com", "production": "https://proxy.momoapi.mtn.com"}

    def __init__(self, client: httpx.AsyncClient, subscription_key: str, api_user: str, api_key: str, target_environment: str = "sandbox", default_currency: str = "XOF") -> None:
        self._client, self._subscription_key, self._api_user, self._api_key = client, subscription_key, api_user, api_key
        self._target_environment, self._default_currency, self._base_url = target_environment, default_currency, self._BASE_URLS[target_environment]
        self._token: str | None = None; self._token_expires_at = 0.0

    async def initiate_payment(self, params: PaymentRequest) -> PaymentSession:
        if not params.customer_phone: raise ProviderError(PaymentError.INVALID_PHONE, "MTN MoMo requires customer_phone")
        session_id = str(uuid.uuid4())
        await self._request("POST", "/collection/v1_0/requesttopay", session_id, json={"amount": str(params.amount), "currency": params.currency or self._default_currency, "externalId": params.reference, "payer": {"partyIdType": "MSISDN", "partyId": params.customer_phone}, "payerMessage": "Payment request", "payeeNote": params.reference})
        return PaymentSession(id=session_id, reference=params.reference, amount=params.amount, currency=params.currency or self._default_currency, status=PaymentStatus.PENDING)

    async def check_status(self, session_id: str) -> PaymentStatus:
        return self._status((await self._transaction(session_id)).get("status"))

    async def handle_webhook(self, raw_body: str | bytes, headers: WebhookHeaders) -> PaymentEvent:
        if self._header(headers, "ocp-apim-subscription-key") != self._subscription_key: raise ProviderError(PaymentError.UNKNOWN, "Invalid MTN MoMo webhook security key")
        payload = self._decode(raw_body); session_id, status = payload.get("referenceId"), payload.get("status")
        if not isinstance(session_id, str): raise ProviderError(PaymentError.UNKNOWN, "Incomplete MTN MoMo webhook payload")
        return PaymentEvent(id=str(payload.get("id", session_id)), session_id=session_id, status=self._status(status), occurred_at=str(payload.get("timestamp", "1970-01-01T00:00:00Z")), reference=payload.get("externalId") if isinstance(payload.get("externalId"), str) else None)

    async def refund(self, session_id: str, amount: int | None = None) -> RefundResult:
        refund_amount = amount if amount is not None else int((await self._transaction(session_id)).get("amount", 0)); refund_id = str(uuid.uuid4())
        if refund_amount <= 0: raise ProviderError(PaymentError.UNKNOWN, "MTN MoMo response is missing original amount")
        await self._request("POST", "/collection/v1_0/refund", refund_id, json={"amount": str(refund_amount), "currency": self._default_currency, "externalId": session_id, "payerMessage": "Refund", "payeeNote": "Refund"})
        return RefundResult(session_id=session_id, refund_id=refund_id, amount=refund_amount, status=PaymentStatus.PENDING)

    async def _transaction(self, session_id: str) -> dict[str, Any]: return await self._request("GET", f"/collection/v1_0/requesttopay/{session_id}")
    async def _request(self, method: str, path: str, reference_id: str | None = None, **kwargs: Any) -> dict[str, Any]:
        token = await self._access_token(); headers = {"Authorization": f"Bearer {token}", "X-Target-Environment": self._target_environment, "Ocp-Apim-Subscription-Key": self._subscription_key}
        if reference_id: headers["X-Reference-Id"] = reference_id
        try: response = await self._client.request(method, self._base_url + path, headers=headers, **kwargs)
        except httpx.HTTPError as exc: raise ProviderError(PaymentError.PROVIDER_TIMEOUT, str(exc)) from exc
        return self._response(response)
    async def _access_token(self) -> str:
        if self._token and time.time() < self._token_expires_at: return self._token
        basic = base64.b64encode(f"{self._api_user}:{self._api_key}".encode()).decode(); response = await self._client.post(self._base_url + "/collection/token/", headers={"Authorization": f"Basic {basic}", "Ocp-Apim-Subscription-Key": self._subscription_key}); payload = self._response(response); token = payload.get("access_token")
        if not isinstance(token, str): raise ProviderError(PaymentError.UNKNOWN, "Invalid MTN MoMo token response")
        self._token, self._token_expires_at = token, time.time() + int(payload.get("expires_in", 300)) - 30; return token
    def _response(self, response: httpx.Response) -> dict[str, Any]:
        payload = response.json() if response.content else {}; payload = payload if isinstance(payload, dict) else {}
        if response.is_error:
            code = str(payload.get("code", "")); error = PaymentError.INSUFFICIENT_FUNDS if code in {"RESOURCE_NOT_FOUND", "PAYER_NOT_FOUND", "NOT_ENOUGH_FUNDS"} else PaymentError.USER_CANCELLED if code in {"APPROVAL_REJECTED", "EXPIRED"} else PaymentError.PROVIDER_TIMEOUT if response.status_code >= 500 or response.status_code == 408 else PaymentError.UNKNOWN
            raise ProviderError(error, str(payload.get("message", "MTN MoMo request failed")))
        return payload
    @staticmethod
    def _status(status: object) -> PaymentStatus: return {"SUCCESSFUL": PaymentStatus.SUCCESS, "PENDING": PaymentStatus.PENDING, "FAILED": PaymentStatus.FAILED}.get(str(status).upper(), PaymentStatus.FAILED)
    @staticmethod
    def _decode(raw: str | bytes) -> dict[str, Any]:
        payload = json.loads(raw)
        if not isinstance(payload, dict): raise ProviderError(PaymentError.UNKNOWN, "Invalid MTN MoMo webhook payload")
        return payload
    @staticmethod
    def _header(headers: WebhookHeaders, name: str) -> str | None: return next((value for key, value in headers.items() if key.lower() == name and isinstance(value, str)), None)
