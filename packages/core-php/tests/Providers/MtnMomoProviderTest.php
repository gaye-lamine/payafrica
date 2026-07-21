<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\Enums\PaymentStatus;
use PayAfrica\Sdk\Providers\MtnMomoProvider;
use PayAfrica\Sdk\Tests\Contract\AbstractProviderContract;

final class MtnMomoProviderTest extends AbstractProviderContract
{
    protected function createProvider(): PaymentProviderInterface
    {
        $responses = match ($this->name()) {
            'testPaymentFailedMappedToPaymentError' => [$this->token(), $this->json(['status' => 'FAILED'])],
            'testPartialRefund' => [$this->token(), new Response(202)],
            'testFullRefund' => [$this->token(), $this->json(['amount' => '1000']), new Response(202)],
            'testProviderTimeoutMappedCorrectly' => [$this->token(), $this->json([], 503)],
            default => [$this->token(), new Response(202), $this->json(['status' => 'SUCCESSFUL'])],
        };
        return new MtnMomoProvider($this->client($responses), 'mtn-key', '3fa85f64-5717-4562-b3fc-2c963f66afa6', 'api-key');
    }

    public function testInitiatePaymentAndCheckStatusSuccess(): void
    {
        $provider = $this->createProvider();
        $session = $provider->initiatePayment(new PaymentRequest(1000, 'XOF', 'contract-success', '+221770000000'));
        self::assertSame(PaymentStatus::Success, $provider->checkStatus($session->id));
    }

    public function testValidWebhookReturnsPaymentEvent(): void
    {
        $event = $this->createProvider()->handleWebhook('{"referenceId":"mtn-1","externalId":"contract-success","status":"SUCCESSFUL"}', ['ocp-apim-subscription-key' => 'mtn-key']);
        self::assertSame('mtn-1', $event->sessionId);
    }

    public function testInvalidWebhookSignatureThrowsException(): void
    {
        $this->expectException(\Throwable::class);
        $this->createProvider()->handleWebhook('{}', ['ocp-apim-subscription-key' => 'invalid']);
    }

    /** @param list<Response> $responses */
    private function client(array $responses): Client { return new Client(['handler' => HandlerStack::create(new MockHandler($responses))]); }
    private function token(): Response { return $this->json(['access_token' => 'token', 'expires_in' => 3600]); }
    private function json(array $body, int $status = 200): Response { return new Response($status, ['Content-Type' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)); }
}
