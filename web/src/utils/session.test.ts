import { afterEach, describe, expect, it } from "vitest";
import { clearToken, getToken, replaceToken, saveToken } from "./session";

afterEach(clearToken);

describe("session token", () => {
  it("is empty before logging in", () => {
    expect(getToken()).toBeNull();
  });

  it("with 'stay logged in', is shared through localStorage while the browser stays open", () => {
    saveToken("tok", true);
    expect(localStorage.getItem("hellojess_token")).toBe("tok");
    expect(getToken()).toBe("tok");
  });

  it("with 'stay logged in', is dropped once the browser was closed (the session cookie is gone)", () => {
    saveToken("tok", true);
    // Closing the browser deletes the cookie without an expiry date but leaves localStorage alone.
    document.cookie = "hellojess_session=; path=/; max-age=0";
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("hellojess_token")).toBeNull();
  });

  it("without 'stay logged in', stays in this tab only", () => {
    saveToken("tok", false);
    expect(localStorage.getItem("hellojess_token")).toBeNull();
    expect(sessionStorage.getItem("hellojess_token")).toBe("tok");
    expect(getToken()).toBe("tok");
  });

  it("a replaced token keeps the same lifetime as the old one", () => {
    saveToken("a", false);
    replaceToken("b");
    expect(sessionStorage.getItem("hellojess_token")).toBe("b");
    expect(localStorage.getItem("hellojess_token")).toBeNull();

    saveToken("c", true);
    replaceToken("d");
    expect(localStorage.getItem("hellojess_token")).toBe("d");
  });

  it("clearToken forgets everything", () => {
    saveToken("tok", true);
    clearToken();
    expect(getToken()).toBeNull();
  });
});
