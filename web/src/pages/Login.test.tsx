import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  verifyCode: vi.fn(),
  resendCode: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({ useAuth: () => mocks }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue({ verification_required: true, purpose: "login", email: "ada@example.com" });
    mocks.verifyCode.mockResolvedValue(undefined);
  });

  it("asks for the emailed code after the password, and logs in with it", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-pw");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(mocks.login).toHaveBeenCalledWith("ada@example.com", "secret-pw");
    expect(await screen.findByText(/We sent a 6-digit code/)).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Code"), "123456");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(mocks.verifyCode).toHaveBeenCalledWith("ada@example.com", "123456", true);
    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });

  it("passes the 'Stay logged in' choice on to the code step", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-pw");
    await user.click(screen.getByLabelText(/Stay logged in/));
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.type(await screen.findByLabelText("Code"), "654321");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(mocks.verifyCode).toHaveBeenCalledWith("ada@example.com", "654321", false);
  });

  it("only accepts digits and needs all six before the button is enabled", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-pw");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.type(await screen.findByLabelText("Code"), "12ab34");
    expect(screen.getByLabelText("Code")).toHaveValue("1234");
    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
  });
});
