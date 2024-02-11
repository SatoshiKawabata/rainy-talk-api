import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

export interface Message {
  messageId: number;
  roomId: ChatRoom["chatRoomId"];
  userId: User["userId"];
  content: string;
  isRoot: boolean;
  // 以下、rootのときは無し
  parentMessageId?: Message["messageId"];
}
