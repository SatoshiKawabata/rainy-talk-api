import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

export interface Message {
  messageId: number;
  roomId: ChatRoom["chatRoomId"];
  userId: User["userId"];
  content: string;
  isRoot: boolean;
  parentMessageId?: Message["messageId"]; // rootのときは無し
}
