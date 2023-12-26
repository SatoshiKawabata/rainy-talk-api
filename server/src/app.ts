import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import {
  initializeChat,
  postMessage,
  requestNextMessage,
} from "./usecases/ChatUseCase";
import gateWays from "./gateways";

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/hello", (req: Request, res: Response) => {
  res.json({ message: "Hello World" });
});

app.post("/initialize", async (req: Request, res: Response) => {
  const str = await initializeChat(req.body, gateWays.user, gateWays.chatRoom);
  res.json({ message: str });
});

app.post("/message", async (req: Request, res: Response) => {
  const message = await postMessage(req.body, gateWays.message);
  res.json({ message });
});

app.get("/next_message", async (req: Request, res: Response) => {
  const message = await requestNextMessage(
    req.body,
    gateWays.message,
    gateWays.messageScheduler,
    gateWays.chatRoom,
    gateWays.user,
    gateWays.messageGenerator
  );
  res.json({ message });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
