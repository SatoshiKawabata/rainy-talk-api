import { ChatRoom } from "./ChatRoom";
import { User } from "./User";

export interface ChatRoomMember {
  chatRoomMemberId: number;
  roomId: ChatRoom["chatRoomId"];
  userId: User["userId"];
  gptSystem: string;
}
