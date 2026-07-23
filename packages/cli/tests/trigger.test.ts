import { describe, expect, it } from "vitest";

import { buildWebhookPayload, signWebhook } from "../src/commands/trigger.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const supportedEvents = [
  ["wave.payment.success", "wave", "success"],
  ["wave.payment.failed", "wave", "failed"],
  ["orange.payment.success", "orange", "success"],
  ["orange.payment.failed", "orange", "failed"],
  ["mtn.payment.success", "mtn", "success"],
  ["mtn.payment.failed", "mtn", "failed"],
] as const;

describe("buildWebhookPayload", () => {
  it.each(supportedEvents)("builds the exact normalized structure for %s", (event, provider, status) => {
    const payload = buildWebhookPayload(event);
    const expected = {
      id: expect.stringMatching(uuidPattern),
      sessionId: expect.stringMatching(uuidPattern),
      status,
      reference: expect.stringMatching(new RegExp(`^trigger-${provider}-${payload.sessionId}$`, "u")),
      occurredAt: expect.stringMatching(isoTimestampPattern),
      ...(status === "failed" ? { error: "UNKNOWN" } : {}),
    };

    expect(payload).toStrictEqual(expected);
    if (status === "success") {
      expect(payload).not.toHaveProperty("error");
    }
  });
});

describe("signWebhook", () => {
  const rawBody = '{"id":"evt_123","status":"success"}';
  const secret = "whsec_test_123";

  it("matches a fixed HMAC-SHA256 test vector", () => {
    expect(signWebhook(rawBody, secret)).toBe("769683777bb970b0dc5740e71e595b9a7b180adf9f81b031c7d2f43bb2c2ab3d");
  });

  it("is stable for identical inputs", () => {
    expect(signWebhook(rawBody, secret)).toBe(signWebhook(rawBody, secret));
  });

  it("changes when the secret changes", () => {
    expect(signWebhook(rawBody, secret)).not.toBe(signWebhook(rawBody, "whsec_other"));
  });

  it("changes when the body changes", () => {
    expect(signWebhook(rawBody, secret)).not.toBe(signWebhook('{"id":"evt_456","status":"success"}', secret));
  });
});
