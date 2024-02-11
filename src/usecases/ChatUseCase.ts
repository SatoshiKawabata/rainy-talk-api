import { ChatRoom } from "../entities/ChatRoom";
import { ChatRoomMember } from "../entities/ChatRoomMember";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
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
  members: (ChatRoomMember & Pick<User, "name">)[];
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
    roomId: room.chatRoomId,
    userIds: users.map((user) => user.userId),
  });
  return {
    room,
    members: members.map((member) => ({
      ...member,
      name: users.find((user) => user.userId === member.userId)?.name ?? "",
    })),
  };
};

// メッセージの投稿
export const postMessage = async (
  p: PostMessageProps,
  messageGateway: MessageGatewayPort
): Promise<Message> => {
  // 親メッセージがあれば、親の子メッセージの紐づけを解除する
  if (p.parentMessageId) {
    const otherChildMsg = await messageGateway.findChildMessage({
      parentId: p.parentMessageId,
    });

    if (otherChildMsg) {
      // p.parentMessageIdのメッセージがあれば子メッセージの紐づけを解除
      await messageGateway.removeParentMessage({ id: otherChildMsg.messageId });
    }
  }

  // Gatewayのメッセージの投稿メソッドを呼ぶ
  const newMsg = await messageGateway.postMessage({
    ...p,
  });

  // メッセージを返す
  return newMsg;
};

// 次のメッセージを取得
export type RequestNextMessageProps = {
  messageId: Message["messageId"];
  apiKey: string;
};

export const requestNextMessage = async (
  { apiKey, messageId }: RequestNextMessageProps,
  messageGatewayPort: MessageGatewayPort,
  messageSchedulerPort: MessageSchedulerPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<Message> => {
  // 次のメッセージ(messageIdの子メッセージ)がDBにあれば返す
  const childMsg = await messageGatewayPort.findChildMessage({
    parentId: messageId,
  });
  if (childMsg) {
    // 残りのメッセージが5件以下の場合、次のメッセージを生成する再帰処理generateMessageRecursiveを呼ぶ
    const { isChainCount, tailMessageId } =
      await messageGatewayPort.hasChainCountOfChildMessages({
        fromMessageId: childMsg.messageId,
        count: 5,
      });
    // childMsgの末尾の子のメッセージが再起処理中の場合は再帰処理は行わない
    const isTailMessageRecursiveGenerating =
      await messageSchedulerPort.isRecursiveGenerating({
        currentMessageId: tailMessageId,
      });
    if (!isTailMessageRecursiveGenerating && !isChainCount) {
      generateMessageRecursive(
        {
          currentMessageId: tailMessageId,
          apiKey,
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
    currentMessageId: messageId,
  });
  if (isGenerating) {
    // 次のメッセージがDBにない かつ 再帰処理中の場合、
    // 再帰処理を待つためにMessageGatewayに対してポーリングを行って
    // 生成されたメッセージを返す
    const msg = await messageGatewayPort.pollingChildMessage({
      currentMessageId: messageId,
    });
    return msg;
  }
  // 次のメッセージがDBにない場合、次のメッセージを生成する再帰処理generateMessageRecursiveを呼ぶ
  const { nextMessage } = await generateMessageRecursive(
    {
      currentMessageId: messageId,
      apiKey,
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
