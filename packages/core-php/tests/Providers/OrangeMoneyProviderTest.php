<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\Exceptions\ProviderException;
use PayAfrica\Sdk\Providers\OrangeMoneyProvider;
use PayAfrica\Sdk\Tests\Contract\AbstractProviderContract;

final class OrangeMoneyProviderTest extends AbstractProviderContract
{
    protected function createProvider(): PaymentProviderInterface
    {
        $responses = match ($this->name()) {
            'testInitiatePaymentAndCheckStatusSuccess' => [$this->token(), $this->json(['paymentUrl' => 'https://orange.test/pay']), $this->json(['transactions' => [['status' => 'SUCCESS']]])],
            'testPaymentFailedMappedToPaymentError' => [$this->token(), $this->json(['transactions' => [['status' => 'FAILED']]])],
            'testProviderTimeoutMappedCorrectly' => [$this->token(), $this->json(['code' => 500], 503)],
            default => [],
        };
        return new OrangeMoneyProvider($this->client($responses), 'id', 'secret', 'merchant', 'site', 'https://merchant.test/callback', 'orange-key');
    }

    public function testValidWebhookReturnsPaymentEvent(): void
    {
        $event = $this->createProvider()->handleWebhook('{"transactionId":"orange-1","reference":"contract-success","status":"SUCCESS"}', ['x-api-key' => 'orange-key']);
        self::assertSame('orange-1', $event->id);
    }

    public function testInvalidWebhookSignatureThrowsException(): void
    {
        $this->expectException(ProviderException::class);
        $this->createProvider()->handleWebhook('{}', ['x-api-key' => 'invalid']);
    }

    public function testPartialRefund(): void
    {
        $this->expectException(ProviderException::class);
        $this->createProvider()->refund('contract-success', 500);
    }

    public function testFullRefund(): void
    {
        $this->expectException(ProviderException::class);
        $this->createProvider()->refund('contract-success');
    }

    /** @param list<Response> $responses */
    private function client(array $responses): Client
    {
        return new Client(['handler' => HandlerStack::create(new MockHandler($responses))]);
    }

    private function token(): Response { return $this->json(['access_token' => 'token', 'expires_in' => 3600]); }
    private function json(array $body, int $status = 200): Response { return new Response($status, ['Content-Type' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)); }
}
