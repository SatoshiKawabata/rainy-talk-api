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
  console.log("req:", req.path, JSON.stringify(req.body));
  next();
});

app.get("/hello", (req: Request, res: Response) => {
  res.status(200).json({ message: "Hello World" });
});

app.post("/data", (req, res) => {
  const data = req.body;
  res.status(201).json({ message: "Data received", data });
});

app.post("/initialize", async (req: Request, res: Response) => {
  console.log("/initialize", req.body);
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
  console.log("/message", req.body);
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
  console.log("/next_message", req.body);
  const apiKey = req.header("api-key");
  try {
    const message = await requestNextMessage(
      { ...req.body, apiKey },
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

export default app;
