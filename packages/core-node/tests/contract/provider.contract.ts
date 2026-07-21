import { describe, it } from "vitest";

import type { PaymentProvider } from "../../src/types.js";

/**
 * Declares the mandatory provider-contract scenarios.
 *
 * Each concrete provider replaces these TODOs with sandbox-backed assertions
 * while preserving the scenario names and contract requirements.
 */
export function runProviderContractTests(
  providerName: string,
  providerFactory: () => PaymentProvider
): void {
  void providerFactory;

  describe(`${providerName} provider contract`, () => {
    it.todo("paiement réussi");
    it.todo("paiement échoué");
    it.todo("webhook valide");
    it.todo("signature de webhook invalide");
    it.todo("remboursement partiel");
    it.todo("remboursement total");
    it.todo("timeout");
  });
}
