<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Providers;

use GuzzleHttp\Psr7\HttpFactory;
use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\DTO\PaymentEvent;
use PayAfrica\Sdk\DTO\PaymentRequest;
use PayAfrica\Sdk\DTO\PaymentSession;
use PayAfrica\Sdk\DTO\RefundResult;
use PayAfrica\Sdk\Enums\PaymentError;
use PayAfrica\Sdk\Enums\PaymentStatus;
use PayAfrica\Sdk\Exceptions\ProviderException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\ResponseInterface;

final class WaveProvider implements PaymentProviderInterface
{
    private const BASE_URL = 'https://api.wave.com/v1';

    public function __construct(private readonly ClientInterface $httpClient, private readonly string $apiKey, private readonly string $webhookSecret)
    {
    }

    public function initiatePayment(PaymentRequest $params): PaymentSession
    {
        $payload = $this->json($this->request('POST', '/checkout/sessions', [
            'amount' => $params->amount,
            'currency' => 'XOF',
            'error_url' => $params->failureUrl,
            'success_url' => $params->successUrl,
            'client_reference' => $params->reference,
        ]));
        $id = $payload['id'] ?? null;
        if (!is_string($id) || $id === '') {
            throw new ProviderException(PaymentError::Unknown, 'Wave checkout response is missing id');
        }
        return new PaymentSession($id, $params->reference, $params->amount, $params->currency, PaymentStatus::Pending, isset($payload['wave_launch_url']) ? (string) $payload['wave_launch_url'] : null);
    }

    public function checkStatus(string $sessionId): PaymentStatus
    {
        $payload = $this->json($this->request('GET', '/checkout/sessions/' . rawurlencode($sessionId)));
        return $this->status((string) ($payload['payment_status'] ?? ''));
    }

    public function handleWebhook(string $rawBody, array $headers): PaymentEvent
    {
        $signature = $this->header($headers, 'x-wave-signature');
        if ($signature === null || !$this->validSignature($rawBody, $signature)) {
            throw new ProviderException(PaymentError::Unknown, 'Invalid Wave webhook signature');
        }
        $payload = $this->decode($rawBody);
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $sessionId = $data['id'] ?? null;
        if (!is_string($sessionId) || $sessionId === '') {
            throw new ProviderException(PaymentError::Unknown, 'Incomplete Wave webhook payload');
        }
        $eventType = (string) ($payload['type'] ?? '');
        $status = $eventType === 'checkout.session.completed' ? PaymentStatus::Success : ($eventType === 'checkout.session.payment_failed' ? PaymentStatus::Failed : $this->status((string) ($data['payment_status'] ?? '')));
        return new PaymentEvent((string) ($payload['id'] ?? $sessionId), $sessionId, $status, (string) ($data['when_completed'] ?? $data['when_created'] ?? gmdate(DATE_ATOM)), isset($data['client_reference']) ? (string) $data['client_reference'] : null);
    }

    public function refund(string $sessionId, ?int $amount = null): RefundResult
    {
        $payload = $this->json($this->request('POST', '/checkout/sessions/' . rawurlencode($sessionId) . '/refund', $amount === null ? null : ['amount' => $amount]));
        $refundId = $payload['id'] ?? null;
        $refundAmount = $payload['amount'] ?? null;
        if (!is_string($refundId) || !is_int($refundAmount)) {
            throw new ProviderException(PaymentError::Unknown, 'Incomplete Wave refund response');
        }
        return new RefundResult($sessionId, $refundId, $refundAmount, isset($payload['status']) ? $this->status((string) $payload['status']) : PaymentStatus::Success);
    }

    private function request(string $method, string $path, ?array $body = null): ResponseInterface
    {
        $factory = new HttpFactory();
        $request = $factory->createRequest($method, self::BASE_URL . $path)
            ->withHeader('Authorization', 'Bearer ' . $this->apiKey)
            ->withHeader('Content-Type', 'application/json');
        if ($body !== null) {
            $request = $request->withBody($factory->createStream(json_encode($body, JSON_THROW_ON_ERROR)));
        }
        try {
            $response = $this->httpClient->sendRequest($request);
        } catch (ClientExceptionInterface $exception) {
            throw new ProviderException(PaymentError::ProviderTimeout, $exception->getMessage());
        }
        if ($response->getStatusCode() >= 400) {
            $payload = $this->json($response);
            $code = (string) ($payload['error_code'] ?? '');
            $error = $code === 'insufficient-funds' ? PaymentError::InsufficientFunds : ($code === 'payer-mobile-mismatch' ? PaymentError::InvalidPhone : ($response->getStatusCode() >= 500 || $response->getStatusCode() === 408 ? PaymentError::ProviderTimeout : PaymentError::Unknown));
            throw new ProviderException($error, (string) ($payload['error_message'] ?? 'Wave request failed'));
        }
        return $response;
    }

    private function validSignature(string $rawBody, string $signature): bool
    {
        $expected = hash_hmac('sha256', $rawBody, $this->webhookSecret);
        foreach (explode(',', $signature) as $candidate) {
            $candidate = preg_replace('/^v1=/', '', trim($candidate)) ?? '';
            if (hash_equals($expected, $candidate)) {
                return true;
            }
        }
        return false;
    }

    private function status(string $status): PaymentStatus
    {
        return match (strtolower($status)) {
            'succeeded', 'success' => PaymentStatus::Success,
            'processing', 'pending' => PaymentStatus::Pending,
            'cancelled', 'failed' => PaymentStatus::Failed,
            default => throw new ProviderException(PaymentError::Unknown, 'Unknown Wave payment status'),
        };
    }

    private function json(ResponseInterface $response): array { return $this->decode((string) $response->getBody()); }
    private function decode(string $body): array { $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR); if (!is_array($payload)) { throw new ProviderException(PaymentError::Unknown, 'Invalid Wave JSON response'); } return $payload; }
    private function header(array $headers, string $name): ?string { foreach ($headers as $key => $value) { if (strtolower($key) === $name && is_string($value)) { return $value; } } return null; }
}
