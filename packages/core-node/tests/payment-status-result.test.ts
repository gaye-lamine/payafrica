import { describe, expect, it } from "vitest";

import {
  PaymentError,
  PaymentStatus,
  type PaymentStatusResult,
} from "../src/types.js";

type Assert<T extends true> = T;
type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;

type FailedWithoutErrorIsRejected = Assert<
  IsAssignable<{ status: PaymentStatus.Failed }, PaymentStatusResult> extends false ? true : false
>;
type SuccessWithErrorIsRejected = Assert<
  IsAssignable<
    { status: PaymentStatus.Success; error: PaymentError.Unknown },
    PaymentStatusResult
  > extends false
    ? true
    : false
>;

describe("PaymentStatusResult", () => {
  it("rejects invalid forms at TypeScript compile time only", () => {
    const failedWithoutError = { status: PaymentStatus.Failed } as unknown as PaymentStatusResult;
    const successWithError = {
      status: PaymentStatus.Success,
      error: PaymentError.Unknown,
    } as unknown as PaymentStatusResult;

    expect(failedWithoutError.status).toBe(PaymentStatus.Failed);
    expect(successWithError.status).toBe(PaymentStatus.Success);
  });
});
