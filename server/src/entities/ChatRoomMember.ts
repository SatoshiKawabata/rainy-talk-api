import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

export interface ChatRoomMember {
  id: number;
  roomId: ChatRoom["id"];
  userId: User["id"];
  gptSystem: string;
}
