from __future__ import annotations

import httpx
import pytest
import respx

from payafrica.enums import PaymentStatus
from payafrica.models import PaymentRequest
from payafrica.providers.mtn_momo import MtnMomoProvider


@pytest.mark.asyncio
@respx.mock
async def test_mtn_momo_contract_scenarios() -> None:
    base = "https://sandbox.momodeveloper.mtn.com"
    respx.post(base + "/collection/token/").mock(return_value=httpx.Response(200, json={"access_token": "token", "expires_in": 3600}))
    respx.post(base + "/collection/v1_0/requesttopay").mock(return_value=httpx.Response(202))
    respx.get(url__regex=base + r"/collection/v1_0/requesttopay/.*").mock(return_value=httpx.Response(200, json={"status": "SUCCESSFUL", "amount": "1000"}))
    respx.post(base + "/collection/v1_0/refund").mock(return_value=httpx.Response(202))
    async with httpx.AsyncClient() as client:
        provider = MtnMomoProvider(client, "subscription-key", "3fa85f64-5717-4562-b3fc-2c963f66afa6", "api-key")
        session = await provider.initiate_payment(PaymentRequest(amount=1000, currency="XOF", reference="contract-success", customer_phone="+221770000000"))
        assert await provider.check_status(session.id) is PaymentStatus.SUCCESS
        assert (await provider.handle_webhook('{"referenceId":"mtn-1","status":"SUCCESSFUL"}', {"ocp-apim-subscription-key": "subscription-key"})).session_id == "mtn-1"
        assert (await provider.refund(session.id, 500)).status is PaymentStatus.PENDING
