<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Contract;

use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\Enums\PaymentStatus;
use PHPUnit\Framework\TestCase;

abstract class AbstractProviderContract extends TestCase
{
    abstract protected function createProvider(): PaymentProviderInterface;

    public function testInitiatePaymentAndCheckStatusSuccess(): void
    {
        $provider = $this->createProvider();
        $request = new PaymentRequest(1000, 'XOF', 'contract-success');

        $session = $provider->initiatePayment($request);

        self::assertNotSame('', $session->id);
        self::assertSame($request->reference, $session->reference);
        self::assertSame($request->amount, $session->amount);
        self::assertSame($request->currency, $session->currency);
        self::assertSame(PaymentStatus::Success, $provider->checkStatus($session->id));
    }

    public function testPaymentFailedMappedToPaymentError(): void
    {
        self::assertSame(PaymentStatus::Failed, $this->createProvider()->checkStatus('contract-failed'));
    }

    public function testValidWebhookReturnsPaymentEvent(): void
    {
        $event = $this->createProvider()->handleWebhook(
            '{"id":"contract-event","sessionId":"contract-success","status":"success"}',
            ['x-contract-webhook-key' => 'valid']
        );

        self::assertNotSame('', $event->id);
        self::assertNotSame('', $event->sessionId);
        self::assertSame(PaymentStatus::Success, $event->status);
        self::assertNotSame('', $event->occurredAt);
    }

    public function testInvalidWebhookSignatureThrowsException(): void
    {
        $this->expectException(\Throwable::class);
        $this->createProvider()->handleWebhook('{"status":"success"}', ['x-contract-webhook-key' => 'invalid']);
    }

    public function testPartialRefund(): void
    {
        $refund = $this->createProvider()->refund('contract-success', 500);

        self::assertSame('contract-success', $refund->sessionId);
        self::assertSame(500, $refund->amount);
    }

    public function testFullRefund(): void
    {
        $refund = $this->createProvider()->refund('contract-success');

        self::assertSame('contract-success', $refund->sessionId);
        self::assertGreaterThan(0, $refund->amount);
    }

    public function testProviderTimeoutMappedCorrectly(): void
    {
        $this->expectException(\Throwable::class);
        $this->createProvider()->checkStatus('contract-timeout');
    }
}
