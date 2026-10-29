import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { WORKSPACE_KEY, api, errorMessages } from "./api";
import { saveToken } from "./utils/session";

const failure = (status: number | undefined, data?: unknown) =>
  new AxiosError("failed", "ERR", undefined, undefined, status ? ({ status, data } as never) : undefined);

describe("errorMessages", () => {
  it("lists the validation message of every field in error", () => {
    const err = failure(422, {
      detail: "Validation failed",
      errors: [
        { field: "title", message: "title must not be empty" },
        { field: "status", message: "status is required" },
      ],
    });
    expect(errorMessages(err)).toEqual(["title must not be empty", "status is required"]);
  });

  it("uses the general message, a network message, or a generic one", () => {
    expect(errorMessages(failure(401, { detail: "Incorrect email or password" }))).toEqual(["Incorrect email or password"]);
    expect(errorMessages(failure(undefined))[0]).toMatch(/Could not reach the server/);
    expect(errorMessages(new Error("boom"))).toEqual(["Something went wrong. Please try again."]);
  });
});

describe("request interceptor", () => {
  beforeEach(() => localStorage.clear());

  type Handler = { fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig };

  // Runs the registered request interceptors on a bare config, without sending anything.
  function headersFor() {
    let config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    for (const handler of (api.interceptors.request as unknown as { handlers: Handler[] }).handlers) {
      config = handler.fulfilled(config);
    }
    return config.headers;
  }

  it("sends nothing extra when logged out and no workspace is chosen", () => {
    const headers = headersFor();
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Workspace-Id"]).toBeUndefined();
  });

  it("sends the token and the chosen workspace", () => {
    saveToken("tok", true);
    localStorage.setItem(WORKSPACE_KEY, "w9");
    const headers = headersFor();
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers["X-Workspace-Id"]).toBe("w9");
  });
});
