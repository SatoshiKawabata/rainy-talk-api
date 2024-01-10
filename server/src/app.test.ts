import request from "supertest";
import app from "./app";

describe("GET /hello", () => {
  it("responds with json", async () => {
    const response = await request(app)
      .get("/hello")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ message: "Hello World" });
  });
});
