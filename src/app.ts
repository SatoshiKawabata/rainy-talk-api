import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import {
  initializeChat,
  postMessage,
  requestNextMessage,
} from "./usecases/ChatUseCase";
import gateWays from "./gateways";
import { UseCaseError } from "./errors/UseCaseError";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  const apiKey = req.header("api-key");
  if (!apiKey) {
    res.status(401).json({ message: "Unauthorized" });
    console.error(
      "Error: no api-key (req:",
      req.path,
      JSON.stringify(req.body)
    );
    return;
  }
  console.log("req:", req.url, JSON.stringify(req.body));
  next();
});

app.get("/hello", (req: Request, res: Response) => {
  console.log(req.query);
  res.status(200).json({ message: "Hello World" });
});

app.post("/data", (req, res) => {
  const data = req.body;
  res.status(201).json({ message: "Data received", data });
});

app.post("/initialize", async (req: Request, res: Response) => {
  console.log("/initialize", JSON.stringify(req.body));
  try {
    const data = await initializeChat(
      req.body,
      gateWays.user,
      gateWays.chatRoom
    );
    res.json(data);
  } catch (e: unknown) {
    const error = e as UseCaseError;
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/message", async (req: Request, res: Response) => {
  console.log("/message", JSON.stringify(req.body));
  try {
    const message = await postMessage(req.body, gateWays.message);
    res.json({ message });
  } catch (e: unknown) {
    const error = e as UseCaseError;
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/next_message", async (req: Request, res: Response) => {
  console.log("/next_message", req.query);
  const messageId = Number(req.query.messageId);
  const apiKey = req.header("api-key")!;
  const model = req.header("model") ?? "gpt-3.5-turbo";
  try {
    const message = await requestNextMessage(
      { messageId, apiKey, model },
      gateWays.message,
      gateWays.messageScheduler,
      gateWays.chatRoom,
      gateWays.user,
      gateWays.messageGenerator
    );
    res.json({ message });
  } catch (e: unknown) {
    const error = e as UseCaseError;
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/dump/users", async (req: Request, res: Response) => {
  const users = await gateWays.user.getAllUsers();
  console.log("/dump/users", JSON.stringify(users));
  res.json({ users });
});

app.get("/dump/chat_rooms", async (req: Request, res: Response) => {
  const chatRooms = await gateWays.chatRoom.getAllChatRooms();
  console.log("/dump/chat_rooms", JSON.stringify(chatRooms));
  res.json({ chatRooms });
});

app.get(
  "/dump/chat_room_members/:roomId",
  async (req: Request, res: Response) => {
    const roomId = Number(req.params.roomId);
    const chatRoomMembers = await gateWays.chatRoom.getChatMembers({
      roomId,
    });
    console.log("/dump/chat_room_members", JSON.stringify(chatRoomMembers));
    res.json({ chatRoomMembers });
  }
);

app.get("/dump/messages/:roomId", async (req: Request, res: Response) => {
  const messages = await gateWays.message.getMessagesByRoomId({
    roomId: Number(req.params.roomId),
  });
  console.log("/dump/messages", JSON.stringify(messages));
  res.json({ messages });
});

export default app;
