from __future__ import annotations

import hashlib
import hmac

import httpx
import pytest
import respx

from payafrica.enums import PaymentStatus
from payafrica.models import PaymentRequest
from payafrica.providers.wave import WaveProvider


@pytest.mark.asyncio
@respx.mock
async def test_wave_contract_scenarios() -> None:
    respx.post("https://api.wave.com/v1/checkout/sessions").mock(return_value=httpx.Response(200, json={"id": "wave-1", "wave_launch_url": "https://wave.test/pay"}))
    respx.get("https://api.wave.com/v1/checkout/sessions/wave-1").mock(return_value=httpx.Response(200, json={"payment_status": "succeeded"}))
    respx.post("https://api.wave.com/v1/checkout/sessions/wave-1/refund").mock(return_value=httpx.Response(200, json={"id": "refund-1", "amount": 500, "status": "succeeded"}))
    async with httpx.AsyncClient() as client:
        provider = WaveProvider(client, "key", "secret")
        session = await provider.initiate_payment(PaymentRequest(amount=1000, currency="XOF", reference="contract-success"))
        assert await provider.check_status(session.id) is PaymentStatus.SUCCESS
        raw = '{"id":"event","type":"checkout.session.completed","data":{"id":"wave-1"}}'; signature = hmac.new(b"secret", raw.encode(), hashlib.sha256).hexdigest()
        assert (await provider.handle_webhook(raw, {"x-wave-signature": signature})).status is PaymentStatus.SUCCESS
        assert (await provider.refund(session.id, 500)).amount == 500
