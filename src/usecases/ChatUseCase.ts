import { ChatRoom } from "../entities/ChatRoom";
import { ChatRoomMember } from "../entities/ChatRoomMember";
import { Message } from "../entities/Message";
import { ErrorCodes, UseCaseError } from "../errors/UseCaseError";
import { InMemoryUserGateway } from "../gateways/InMemoryUserGateway";
import { ChatRoomGatewayPort } from "../ports/ChatRoomGatewayPort";
import {
  MessageGatewayPort,
  PostMessageProps,
} from "../ports/MessageGatewayPort";
import { MessageGeneratorGatewayPort } from "../ports/MessageGeneratorGatewayPort";
import { MessageSchedulerPort } from "../ports/MessageSchedulerPort";
import { CreateUserProps, UserGatewayPort } from "../ports/UserGatewayPort";
import { generateMessageRecursive } from "../utils/MessageGenerateUtils";

export type InitializeChatProps = {
  users: CreateUserProps[];
  chatRoomName: string;
};

export type InitializeChatResponse = {
  room: ChatRoom;
  members: ChatRoomMember[];
};

export const initializeChat = async (
  p: InitializeChatProps,
  userGateway: UserGatewayPort,
  chatRoomGateway: ChatRoomGatewayPort
): Promise<InitializeChatResponse> => {
  // ユーザーの作成
  const users = await Promise.all(
    p.users.map(async (user) => await userGateway.createUser(user))
  );
  // チャットルームの作成
  const room = await chatRoomGateway.createChatRoom({ name: p.chatRoomName });
  // チャットメンバーの追加
  const members = await chatRoomGateway.addChatRoomMembers({
    roomId: room.id,
    userIds: users.map((user) => user.id),
  });
  return {
    room,
    members,
  };
};

// メッセージの投稿
export const postMessage = async (
  p: PostMessageProps,
  messageGateway: MessageGatewayPort,
  messageGeneratorGateway: MessageGeneratorGatewayPort,
  userGateway: InMemoryUserGateway,
  chatRoomGateway: ChatRoomGatewayPort
): Promise<Message> => {
  // 親メッセージがあれば、親の子メッセージの紐づけを解除する
  if (p.parentMessageId) {
    const otherChildMsg = await messageGateway.findChildMessage({
      parentId: p.parentMessageId,
    });

    if (otherChildMsg) {
      // p.parentMessageIdのメッセージがあれば子メッセージの紐づけを解除
      await messageGateway.removeParentMessage({ id: otherChildMsg.id });
    }
  }

  // Gatewayのメッセージの投稿メソッドを呼ぶ
  const newMsg = await messageGateway.postMessage({
    ...p,
  });

  // 投稿したメッセージがAIの場合、再帰的にメッセージを生成する
  const users = await userGateway.getUsers({ ids: [p.userId] });
  if (users.length === 0) {
    throw new UseCaseError(
      `user not found: userId=${p.userId}`,
      ErrorCodes.FailedToPostMessage
    );
  }
  const chatMember = await chatRoomGateway.findChatRoomMember({
    userId: p.userId,
  });
  if (!chatMember) {
    throw new UseCaseError(
      `chat member not found: userId=${p.userId}`,
      ErrorCodes.FailedToPostMessage
    );
  }
  const [user] = users;
  messageGeneratorGateway.generate({
    info: {
      aiMessageContent: newMsg.content,
      userName: user.name,
      gptSystem: chatMember.gptSystem ?? user.originalGptSystem,
    },
  });

  // メッセージを返す
  return newMsg;
};

// 次のメッセージを取得
export type RequestNextMessageProps = {
  messageId: Message["id"];
  roomId: ChatRoom["id"];
};

export const requestNextMessage = async (
  p: RequestNextMessageProps,
  messageGatewayPort: MessageGatewayPort,
  messageSchedulerPort: MessageSchedulerPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<Message> => {
  // 次のメッセージ(messageIdの子メッセージ)がDBにあれば返す
  const childMsg = await messageGatewayPort.findChildMessage({
    parentId: p.messageId,
  });
  if (childMsg) {
    // 残りのメッセージが3件以下の場合、次のメッセージを生成する再帰処理generateMessageRecursiveを呼ぶ
    const { isChainCount, tailMessageId } =
      await messageGatewayPort.hasChainCountOfChildMessages({
        fromMessageId: childMsg.id,
        count: 3,
      });
    if (!isChainCount) {
      await generateMessageRecursive(
        {
          currentMessageId: tailMessageId,
        },
        messageGatewayPort,
        messageSchedulerPort,
        chatRoomGatewayPort,
        userGatewayPort,
        messageGeneratorGatewayPort
      );
    }
    // 子メッセージが存在している場合は子メッセージを返す
    return childMsg;
  }

  const isGenerating = await messageSchedulerPort.isRecursiveGenerating({
    currentMessageId: p.messageId,
  });
  if (isGenerating) {
    // 次のメッセージがDBにない かつ 再帰処理中の場合、
    // 再帰処理を待つためにMessageGatewayに対してポーリングを行って
    // 生成されたメッセージを返す
    const msg = await messageGatewayPort.pollingChildMessage({
      currentMessageId: p.messageId,
    });
    return msg;
  }
  // 次のメッセージがDBにない場合、次のメッセージを生成する再帰処理generateMessageRecursiveを呼ぶ
  const { nextMessage } = await generateMessageRecursive(
    {
      currentMessageId: p.messageId,
    },
    messageGatewayPort,
    messageSchedulerPort,
    chatRoomGatewayPort,
    userGatewayPort,
    messageGeneratorGatewayPort
  );
  // 再帰処理で生成したメッセージを返す
  return nextMessage;
};
