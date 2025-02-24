import fs from "fs/promises";
import path from "path";
import { Message } from "../entities/Message";

const STORAGE_FILE = path.join(process.cwd(), "data", "messages.json");

export const saveMessages = async (messages: Message[]) => {
  await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
  await fs.writeFile(STORAGE_FILE, JSON.stringify(messages, null, 2), "utf-8");
};
