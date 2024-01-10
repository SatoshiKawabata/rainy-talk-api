import request from "supertest";
import app from "./app";
import {
  InitializeChatProps,
  InitializeChatResponse,
} from "./usecases/ChatUseCase";

describe("GET /hello", () => {
  it("responds with json", async () => {
    const response = await request(app)
      .get("/hello")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ message: "Hello World" });
  });
});

describe("POST /data", () => {
  it("responds with json", async () => {
    const testData = { key: "value" };

    const response = await request(app)
      .post("/data")
      .send(testData) // テストデータを送信
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      message: "Data received",
      data: testData,
    });
  });
});

describe("POST /initialize", () => {
  it("can initialize chat and respond room and chat members", async () => {
    const testData: InitializeChatProps = {
      chatRoomName: "Test Room",
      users: [
        {
          isAI: false,
          name: "User1",
          originalGptSystem: "gpt system1",
        },
      ],
    };
    const expected: InitializeChatResponse = {
      members: [
        {
          gptSystem: "",
          id: 0,
          roomId: 0,
          userId: 1,
        },
      ],
      room: {
        id: 0,
        name: "Test Room",
      },
    };
    const response = await request(app)
      .post("/initialize")
      .send(testData)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(expected);
  });
});
