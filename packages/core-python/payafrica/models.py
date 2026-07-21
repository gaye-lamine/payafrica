from __future__ import annotations

from typing import Mapping

from pydantic import BaseModel, ConfigDict, Field

from .enums import PaymentError, PaymentStatus


class _FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True)


class PaymentRequest(_FrozenModel):
    amount: int = Field(gt=0)
    currency: str
    reference: str
    customer_phone: str | None = None
    success_url: str | None = None
    failure_url: str | None = None
    metadata: Mapping[str, str] = Field(default_factory=dict)


class PaymentSession(_FrozenModel):
    id: str
    reference: str
    amount: int
    currency: str
    status: PaymentStatus
    payment_url: str | None = None
    expires_at: str | None = None


class PaymentEvent(_FrozenModel):
    id: str
    session_id: str
    status: PaymentStatus
    occurred_at: str
    reference: str | None = None
    error: PaymentError | None = None


class RefundResult(_FrozenModel):
    session_id: str
    refund_id: str
    amount: int
    status: PaymentStatus
