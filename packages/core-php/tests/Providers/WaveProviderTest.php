<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\Providers\WaveProvider;
use PayAfrica\Sdk\Tests\Contract\AbstractProviderContractTest;

final class WaveProviderTest extends AbstractProviderContractTest
{
    private const SECRET = 'wave-secret';

    protected function createProvider(): PaymentProviderInterface
    {
        $responses = match ($this->name()) {
            'testInitiatePaymentAndCheckStatusSuccess' => [$this->json(['id' => 'wave-1', 'wave_launch_url' => 'https://wave.test/pay']), $this->json(['payment_status' => 'succeeded'])],
            'testPaymentFailedMappedToPaymentError' => [$this->json(['payment_status' => 'cancelled'])],
            'testPartialRefund' => [$this->json(['id' => 'refund-1', 'amount' => 500, 'status' => 'succeeded'])],
            'testFullRefund' => [$this->json(['id' => 'refund-2', 'amount' => 1000, 'status' => 'succeeded'])],
            'testProviderTimeoutMappedCorrectly' => [$this->json([], 503)],
            default => [],
        };
        return new WaveProvider($this->client($responses), 'wave_sn_test_key', self::SECRET);
    }

    public function testValidWebhookReturnsPaymentEvent(): void
    {
        $rawBody = '{"id":"event-1","type":"checkout.session.completed","data":{"id":"wave-1","payment_status":"succeeded"}}';
        $signature = hash_hmac('sha256', $rawBody, self::SECRET);
        self::assertSame('wave-1', $this->createProvider()->handleWebhook($rawBody, ['x-wave-signature' => $signature])->sessionId);
    }

    public function testInvalidWebhookSignatureThrowsException(): void
    {
        $this->expectException(\Throwable::class);
        $this->createProvider()->handleWebhook('{}', ['x-wave-signature' => 'invalid']);
    }

    /** @param list<Response> $responses */
    private function client(array $responses): Client { return new Client(['handler' => HandlerStack::create(new MockHandler($responses))]); }
    private function json(array $body, int $status = 200): Response { return new Response($status, ['Content-Type' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)); }
}
