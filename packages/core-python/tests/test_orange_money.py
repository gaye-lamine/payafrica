from __future__ import annotations

import httpx
import pytest
import respx

from payafrica.enums import PaymentStatus
from payafrica.errors import ProviderError
from payafrica.models import PaymentRequest
from payafrica.providers.orange_money import OrangeMoneyProvider


def provider(client: httpx.AsyncClient) -> OrangeMoneyProvider:
    return OrangeMoneyProvider(client, "id", "secret", "merchant", "site", "https://merchant.test/callback", "webhook-key")


@pytest.mark.asyncio
@respx.mock
async def test_orange_money_contract_scenarios() -> None:
    respx.post("https://api.sandbox.orange-sonatel.com/oauth/v1/token").mock(return_value=httpx.Response(200, json={"access_token": "token", "expires_in": 3600}))
    respx.post("https://api.sandbox.orange-sonatel.com/v1/onlinePayment/prepare").mock(return_value=httpx.Response(200, json={"paymentUrl": "https://orange.test/pay"}))
    respx.get("https://api.sandbox.orange-sonatel.com/api/eWallet/v1/transactions").mock(return_value=httpx.Response(200, json={"transactions": [{"status": "SUCCESS"}]}))
    async with httpx.AsyncClient() as client:
        instance = provider(client)
        session = await instance.initiate_payment(PaymentRequest(amount=1000, currency="XOF", reference="contract-success"))
        assert session.id == "contract-success"
        assert await instance.check_status(session.id) is PaymentStatus.SUCCESS
        assert (await instance.handle_webhook('{"reference":"contract-success","status":"SUCCESS"}', {"x-api-key": "webhook-key"})).session_id == "contract-success"
        with pytest.raises(ProviderError): await instance.handle_webhook("{}", {"x-api-key": "bad"})
        with pytest.raises(NotImplementedError): await instance.refund(session.id, 500)
        with pytest.raises(NotImplementedError): await instance.refund(session.id)
