import { ChatRoom } from "../entities/ChatRoom";
import { ChatRoomMember } from "../entities/ChatRoomMember";
import { User } from "../entities/User";

export type CreateChatRoomProps = {
  name: string;
};

export type AddChatRoomMembersProps = {
  roomId: ChatRoom["chatRoomId"];
  userIds: User["userId"][];
};

export type UpdateChatRoomMemberGptSystemProps = {
  chatRoomMemberId: ChatRoomMember["chatRoomMemberId"];
  gptSystem: ChatRoomMember["gptSystem"];
};

export type GetChatMembersProps = {
  roomId?: ChatRoom["chatRoomId"];
};

export type FindChatMembersProps = {
  userId: ChatRoomMember["userId"];
};

export interface ChatRoomGatewayPort {
  createChatRoom(p: CreateChatRoomProps): Promise<ChatRoom>;
  addChatRoomMembers(p: AddChatRoomMembersProps): Promise<ChatRoomMember[]>;
  updateChatRoomMemberGptSystem(
    p: UpdateChatRoomMemberGptSystemProps
  ): Promise<ChatRoomMember>;
  getChatMembers(p: GetChatMembersProps): Promise<ChatRoomMember[]>;
  findChatRoomMember(
    P: FindChatMembersProps
  ): Promise<ChatRoomMember | undefined>;
  // dump用
  getAllChatRooms(): Promise<ChatRoom[]>;
}
