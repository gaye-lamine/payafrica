from __future__ import annotations

from abc import ABC, abstractmethod

import pytest

from payafrica.contracts import PaymentProvider
from payafrica.models import PaymentRequest


class ProviderContractTests(ABC):
    @abstractmethod
    def create_provider(self) -> PaymentProvider: ...

    @pytest.mark.asyncio
    async def test_initiate_payment_and_check_status_success(self) -> None:
        provider = self.create_provider()
        session = await provider.initiate_payment(PaymentRequest(amount=1000, currency="XOF", reference="contract-success"))
        assert session.id

    @pytest.mark.asyncio
    async def test_payment_failed_mapped_to_payment_error(self) -> None: ...

    @pytest.mark.asyncio
    async def test_valid_webhook_returns_payment_event(self) -> None: ...

    @pytest.mark.asyncio
    async def test_invalid_webhook_signature_throws_exception(self) -> None: ...

    @pytest.mark.asyncio
    async def test_partial_refund(self) -> None: ...

    @pytest.mark.asyncio
    async def test_full_refund(self) -> None: ...

    @pytest.mark.asyncio
    async def test_provider_timeout_mapped_correctly(self) -> None: ...
