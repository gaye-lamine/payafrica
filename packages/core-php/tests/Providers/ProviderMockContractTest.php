<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\Providers\MtnMomoProvider;
use PayAfrica\Sdk\Providers\OrangeMoneyProvider;
use PayAfrica\Sdk\Providers\WaveProvider;
use PHPUnit\Framework\TestCase;

final class ProviderMockContractTest extends TestCase
{
    public function testInitiatePaymentUsesTheLocalWaveMockContract(): void
    {
        $history = [];
        $client = $this->clientWithHistory([
            new Response(201, ['Content-Type' => 'application/json'], '{"id":"wave-local-1","wave_launch_url":"http://localhost/checkout/wave-local-1"}'),
        ], $history);
        $provider = new WaveProvider(
            $client,
            'mock_wave_key',
            'mock_wave_webhook',
            null,
            'http://localhost:4004/mock/wave',
        );

        $provider->initiatePayment(new PaymentRequest(1200, 'XOF', 'wave-local-order'));

        self::assertCount(1, $history);
        $request = $history[0]['request'];
        self::assertStringStartsWith('http://localhost:4004/mock/wave/checkout/sessions', (string) $request->getUri());
        self::assertSame('POST', $request->getMethod());
        $payload = json_decode((string) $request->getBody(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1200, $payload['amount']);
        self::assertSame('XOF', $payload['currency']);
    }

    public function testOrangeInitiatePaymentUsesTheLocalMockContract(): void
    {
        $history = [];
        $provider = new OrangeMoneyProvider($this->clientWithHistory([
            new Response(200, [], '{"access_token":"token","expires_in":3600}'),
            new Response(200, [], '{"paymentUrl":"http://localhost/checkout/orange"}'),
        ], $history), 'mock', 'mock', 'merchant', 'site', 'http://localhost/callback', 'mock', 'sandbox', null, 'http://localhost:4004/mock/orange');
        $provider->initiatePayment(new PaymentRequest(1200, 'XOF', 'orange-local-order'));
        $request = $history[1]['request'];
        self::assertStringStartsWith('http://localhost:4004/mock/orange/v1/onlinePayment/prepare', (string) $request->getUri());
        self::assertSame('POST', $request->getMethod());
        $payload = json_decode((string) $request->getBody(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1200, $payload['amount']);
        self::assertSame('orange-local-order', $payload['reference']);
    }

    public function testMtnInitiatePaymentUsesTheLocalMockContract(): void
    {
        $history = [];
        $provider = new MtnMomoProvider($this->clientWithHistory([
            new Response(200, [], '{"access_token":"token","expires_in":3600}'),
            new Response(202, [], '{}'),
        ], $history), 'mock-subscription', '00000000-0000-4000-8000-000000000001', 'mock-key', 'sandbox', 'XOF', null, 'http://localhost:4004/mock/mtn');
        $provider->initiatePayment(new PaymentRequest(1200, 'XOF', 'mtn-local-order', '221770000000'));
        $request = $history[1]['request'];
        self::assertStringStartsWith('http://localhost:4004/mock/mtn/collection/v1_0/requesttopay', (string) $request->getUri());
        self::assertSame('POST', $request->getMethod());
        $payload = json_decode((string) $request->getBody(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('1200', $payload['amount']);
        self::assertSame('XOF', $payload['currency']);
    }

    /** @param list<Response> $responses @param list<array{request: \Psr\Http\Message\RequestInterface}> $history */
    private function clientWithHistory(array $responses, array &$history): Client
    {
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($history));
        return new Client(['handler' => $stack]);
    }
}
