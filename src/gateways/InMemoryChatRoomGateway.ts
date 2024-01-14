import { ChatRoom } from "../entities/ChatRoom";
import { ChatRoomMember } from "../entities/ChatRoomMember";
import {
  AddChatRoomMembersProps,
  ChatRoomGatewayPort,
  GetChatMembersProps,
  UpdateChatRoomMemberGptSystemProps,
} from "../ports/ChatRoomGatewayPort";
import { CreateUserProps } from "../ports/UserGatewayPort";

const chatRooms: ChatRoom[] = [];
const chatRoomMembers: ChatRoomMember[] = [];

export class InMemoryChatRoomGateway implements ChatRoomGatewayPort {
  updateChatRoomMemberGptSystem(
    p: UpdateChatRoomMemberGptSystemProps
  ): Promise<ChatRoomMember> {
    const member = chatRoomMembers.find(
      (member) => member.id === p.chatRoomMemberId
    );
    if (!member) {
      throw new Error(`No such chat room member: ${JSON.stringify(p)}`);
    }
    member.gptSystem = p.gptSystem;
    return Promise.resolve(member);
  }

  addChatRoomMembers(p: AddChatRoomMembersProps): Promise<ChatRoomMember[]> {
    const newMembers: ChatRoomMember[] = p.userIds.map((userId, i) => ({
      id: chatRoomMembers.length + i,
      gptSystem: "",
      roomId: p.roomId,
      userId,
    }));
    chatRoomMembers.push(...newMembers);
    return Promise.resolve(newMembers);
  }

  createChatRoom(p: CreateUserProps): Promise<ChatRoom> {
    const newChatRoom: ChatRoom = {
      name: p.name,
      id: chatRooms.length,
    };
    chatRooms.push(newChatRoom);
    return Promise.resolve(newChatRoom);
  }
  getChatMembers(p: GetChatMembersProps): Promise<ChatRoomMember[]> {
    const targetRoomMembers = chatRoomMembers.filter(
      (member) => member.roomId === p.roomId
    );
    return Promise.resolve(targetRoomMembers);
  }
  async findChatRoomMember(p: {
    userId: number;
  }): Promise<ChatRoomMember | undefined> {
    return chatRoomMembers.find((member) => member.userId === p.userId);
  }
}
