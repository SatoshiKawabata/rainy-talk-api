import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { initializeChat } from "./usecases/ChatUseCase";
import gateWays from "./gateways";

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/hello", (req: Request, res: Response) => {
  res.json({ message: "Hello World" });
});

app.post("/initialize", (req: Request, res: Response) => {
  initializeChat(req.body, gateWays.user, gateWays.chatRoom);
  res.json({ message: "Hello World" });
});

app.post("/message", (req: Request, res: Response) => {
  initializeChat(req.body, gateWays.user, gateWays.chatRoom);
  res.json({ message: "Hello World" });
});

app.get("/next_message", (req: Request, res: Response) => {
  initializeChat(req.body, gateWays.user, gateWays.chatRoom);
  res.json({ message: "Hello World" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
