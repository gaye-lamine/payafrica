from __future__ import annotations

import json

import httpx
import respx
import pytest

from payafrica.models import PaymentRequest
from payafrica.providers.orange_money import OrangeMoneyProvider
from payafrica.providers.wave import WaveProvider
from payafrica.providers.mtn_momo import MtnMomoProvider


@pytest.mark.asyncio
@respx.mock
async def test_orange_initiate_payment_matches_local_mock_contract() -> None:
    base = "http://localhost:4004/mock/orange"
    respx.post(base + "/oauth/v1/token").mock(return_value=httpx.Response(200, json={"access_token": "token", "expires_in": 3600}))
    route = respx.post(base + "/v1/onlinePayment/prepare").mock(return_value=httpx.Response(200, json={"paymentUrl": "http://localhost/checkout"}))
    async with httpx.AsyncClient() as client:
        provider = OrangeMoneyProvider(client, "mock", "mock", "merchant", "site", "http://localhost/callback", "mock", base_url=base)
        await provider.initiate_payment(PaymentRequest(amount=1200, currency="XOF", reference="orange-local-order"))
    request = route.calls[0].request
    assert request.method == "POST" and str(request.url) == base + "/v1/onlinePayment/prepare"
    assert json.loads(request.content) ["amount"] == 1200
    assert json.loads(request.content)["reference"] == "orange-local-order"


@pytest.mark.asyncio
@respx.mock
async def test_wave_initiate_payment_matches_local_mock_contract() -> None:
    base = "http://localhost:4004/mock/wave"
    route = respx.post(base + "/checkout/sessions").mock(return_value=httpx.Response(201, json={"id": "wave-local", "wave_launch_url": "http://localhost/checkout"}))
    async with httpx.AsyncClient() as client:
        provider = WaveProvider(client, "mock", "mock", base_url=base)
        await provider.initiate_payment(PaymentRequest(amount=1200, currency="XOF", reference="wave-local-order"))
    request = route.calls[0].request
    assert request.method == "POST" and str(request.url) == base + "/checkout/sessions"
    payload = json.loads(request.content)
    assert payload["amount"] == 1200 and payload["currency"] == "XOF"


@pytest.mark.asyncio
@respx.mock
async def test_mtn_initiate_payment_matches_local_mock_contract() -> None:
    base = "http://localhost:4004/mock/mtn"
    respx.post(base + "/collection/token/").mock(return_value=httpx.Response(200, json={"access_token": "token", "expires_in": 3600}))
    route = respx.post(base + "/collection/v1_0/requesttopay").mock(return_value=httpx.Response(202, json={}))
    async with httpx.AsyncClient() as client:
        provider = MtnMomoProvider(client, "mock", "00000000-0000-4000-8000-000000000001", "mock", base_url=base)
        await provider.initiate_payment(PaymentRequest(amount=1200, currency="XOF", reference="mtn-local-order", customer_phone="221770000000"))
    request = route.calls[0].request
    assert request.method == "POST" and str(request.url) == base + "/collection/v1_0/requesttopay"
    payload = json.loads(request.content)
    assert payload["amount"] == "1200" and payload["currency"] == "XOF"
