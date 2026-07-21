<?php

declare(strict_types=1);

namespace PayAfrica\Sdk\Tests\Providers;

use PayAfrica\Sdk\Contracts\PaymentProviderInterface;
use PayAfrica\Sdk\Providers\TemplateProvider;
use PayAfrica\Sdk\Tests\Contract\AbstractProviderContractTest;

final class TemplateProviderTest extends AbstractProviderContractTest
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestIncomplete('TemplateProvider is a skeleton; implement a concrete provider first.');
    }

    protected function createProvider(): PaymentProviderInterface
    {
        return new TemplateProvider();
    }
}
