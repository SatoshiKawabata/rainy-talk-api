import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

export interface Message {
  id: number;
  roomId: ChatRoom["id"];
  userId: User["id"];
  content: string;
  isRoot: boolean;
  parentMessageId?: Message["id"]; // rootのときは無し
}
