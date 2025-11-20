//------------------descomentar en practico-2--------------------------------
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
//------------------descomentar en practico-2--------------------------------

import nodemailer from "nodemailer";

import AuthService from "../../src/services/authService";
import db from "../../src/db";
import { User } from "../../src/types/user";
import jwt from "jsonwebtoken";

jest.mock("../../src/db");
const mockedDb = db as jest.MockedFunction<typeof db>;

// mock the nodemailer module
jest.mock("nodemailer");
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;
// mock send email function
mockedNodemailer.createTransport = jest.fn().mockReturnValue({
  sendMail: jest.fn().mockResolvedValue({ success: true }),
});

describe("AuthService.generateJwt", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("createUser", async () => {
    const user = {
      id: "user-123",
      email: "a@a.com",
      password: "password123",
      first_name: "<%=2*2%>", //aca es donde testeamos la inyeccion, que no se ejecute, esto es por ejs
      last_name: "Last",
      username: "username",
    } as User;

    // mock no user exists
    const selectChain = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null), // No existing user
    };
    // Mock the database insert
    const insertChain = {
      returning: jest.fn().mockResolvedValue([user]),
      insert: jest.fn().mockReturnThis(),
    };
    mockedDb
      .mockReturnValueOnce(selectChain as any)
      .mockReturnValueOnce(insertChain as any);

    // Call the method to test
    await AuthService.createUser(user);

    // Verify the database calls
    expect(insertChain.insert).toHaveBeenCalledWith({
      email: user.email,
      password: expect.any(String),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      activated: false,
      invite_token: expect.any(String),
      invite_token_expires: expect.any(Date),
    });

    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "info@example.com",
        to: user.email,
        subject: "Activate your account",
        html: expect.stringMatching(/(?:&lt;|<)%=2\*2%(?:&gt;|>)/),
      })
    );
  });
});
