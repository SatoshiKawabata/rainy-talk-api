import request from "supertest";
import app from "./app";
import {
  InitializeChatProps,
  InitializeChatResponse,
  RequestNextMessageProps,
} from "./usecases/ChatUseCase";
import { PostMessageProps } from "./ports/MessageGatewayPort";

jest.mock("openai", () => {
  return {
    __esModule: true, // ESモジュールのシミュレート
    default: class {
      chat = {
        completions: {
          create: async () => {
            return {
              choices: [
                {
                  message: {
                    content: "first message",
                  },
                },
              ],
            };
          },
        },
      };
    },
  };
});

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
  it("ChatRoomを初期化する", async () => {
    const testData: InitializeChatProps = {
      chatRoomName: "Test Room",
      users: [
        {
          isAI: true,
          name: "AI01",
          originalGptSystem: "gpt system 01",
        },
        {
          isAI: true,
          name: "AI02",
          originalGptSystem: "gpt system 02",
        },
      ],
    };
    const expected: InitializeChatResponse = {
      members: [
        {
          gptSystem: "",
          chatRoomMemberId: 0,
          roomId: 0,
          userId: 0,
          name: "AI01",
        },
        {
          gptSystem: "",
          chatRoomMemberId: 1,
          roomId: 0,
          userId: 1,
          name: "AI02",
        },
      ],
      room: {
        chatRoomId: 0,
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

describe("POST /message", () => {
  it("最初のメッセージを投稿する。それがAIだったら再帰的にメッセージを生成していく", async () => {
    const testData: PostMessageProps = {
      content: "first message",
      roomId: 0,
      userId: 1,
    };
    const response = await request(app)
      .post("/message")
      .send(testData)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      message: {
        content: "first message",
        messageId: 0,
        roomId: 0,
        userId: 1,
        isRoot: true,
      },
    });
  });
});

describe("GET /next_message", () => {
  it("can get next message", async () => {
    const testData: RequestNextMessageProps = {
      messageId: 0,
      roomId: 0,
    };
    const response = await request(app)
      .get("/next_message")
      .send(testData)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      message: {
        content: "first message",
        messageId: 1,
        isRoot: false,
        parentMessageId: 0,
        roomId: 0,
        userId: 0,
      },
    });
  });
});
