import { ChatRoom } from "../entities/ChatRoom";
import { ChatRoomMember } from "../entities/ChatRoomMember";
import { User } from "../entities/User";

export type CreateChatRoomProps = {
  name: string;
};

export type AddChatRoomMembersProps = {
  roomId: ChatRoom["id"];
  userIds: User["id"][];
};

export type UpdateChatRoomMemberGptSystemProps = {
  chatRoomMemberId: ChatRoomMember["id"];
  gptSystem: ChatRoomMember["gptSystem"];
};

export type GetChatMembersProps = {
  roomId: ChatRoom["id"];
};

export type GetChatAiMembersProps = {
  roomId: ChatRoom["id"];
};

export interface ChatRoomGatewayPort {
  createChatRoom(p: CreateChatRoomProps): Promise<ChatRoom>;
  addChatRoomMembers(p: AddChatRoomMembersProps): Promise<ChatRoomMember[]>;
  updateChatRoomMemberGptSystem(
    p: UpdateChatRoomMemberGptSystemProps
  ): Promise<ChatRoomMember>;
  getChatMembers(p: GetChatMembersProps): Promise<ChatRoomMember[]>;
  /** AIのメンバーだけ取得する */
  getChatAiMembers(p: GetChatAiMembersProps): Promise<ChatRoomMember[]>;
}
