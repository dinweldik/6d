import { afterEach, assert, describe, expect, it, vi } from "vitest";

import { isWindowsPlatform, randomUuid } from "./utils";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("isWindowsPlatform", () => {
  it("matches Windows platform identifiers", () => {
    assert.isTrue(isWindowsPlatform("Win32"));
    assert.isTrue(isWindowsPlatform("Windows"));
    assert.isTrue(isWindowsPlatform("windows_nt"));
  });

  it("does not match darwin", () => {
    assert.isFalse(isWindowsPlatform("darwin"));
  });
});

describe("randomUuid", () => {
  it("uses crypto.randomUUID when available", () => {
    const randomUUID = vi.fn(() => "12345678-1234-4234-8234-1234567890ab");
    vi.stubGlobal("crypto", { randomUUID });

    expect(randomUuid()).toBe("12345678-1234-4234-8234-1234567890ab");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("falls back to crypto.getRandomValues when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Uint8Array.from({ length: 16 }, (_, index) => index));
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(randomUuid()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
