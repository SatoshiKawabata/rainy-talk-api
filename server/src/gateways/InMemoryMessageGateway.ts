import { Message } from "../entities/Message";
import {
  DeleteMessageRecursiveProps,
  FindChildMessageProps,
  FindMessageProps,
  GetMessagesRecursivePropsByUser,
  HasChainToRootProps,
  MessageGatewayPort,
  PostMessageProps,
} from "../ports/MessageGatewayPort";

const messages: Message[] = [];

export class InMemoryMessageGateway implements MessageGatewayPort {
  async postMessage(p: PostMessageProps): Promise<Message> {
    const roomMessages = messages.filter((msg) => msg.roomId === p.roomId);
    if (p.parentMessageId) {
      const parentMsg = await this.findMessage({ id: p.parentMessageId });
      if (parentMsg) {
        const childMsg = await this.findChildMessage({ id: parentMsg.id });
        if (childMsg) {
          // 既に親メッセージが子メッセージを持っている
          throw new Error(
            `The message of parentMessageId has a child message already. : ${JSON.stringify(
              p
            )}`
          );
        }
      } else {
        // 親メッセージが存在しない
        throw new Error(
          `No such message of parentMessageId. : ${JSON.stringify(p)}`
        );
      }
    }
    if (roomMessages.length === 0 && p.parentMessageId) {
      // 最初のメッセージなので親メッセージを設定できない
      throw new Error(
        `Can't set parentMessageId because there is no message. : ${JSON.stringify(
          p
        )}`
      );
    } else if (roomMessages.length > 0 && !p.parentMessageId) {
      // 既にメッセージが投稿されているので親メッセージを設定しないといけない
      throw new Error(
        `parentMessageId is necessary when there are some messages. : ${JSON.stringify(
          p
        )}`
      );
    }
    const newMessage: Message = {
      content: p.content,
      id: messages.length,
      isRoot: roomMessages.length === 0,
      roomId: p.roomId,
      userId: p.userId,
      parentMessageId: p.parentMessageId,
    };
    messages.push(newMessage);
    return Promise.resolve(newMessage);
  }
  findMessage(p: FindMessageProps): Promise<Message | undefined> {
    const msg = messages.find((msg) => msg.id === p.id);
    return Promise.resolve(msg);
  }
  findChildMessage(p: FindChildMessageProps): Promise<Message | undefined> {
    const childMsg = messages.find((msg) => msg.parentMessageId === p.id);
    return Promise.resolve(childMsg);
  }
  deleteMessageRecursive(p: DeleteMessageRecursiveProps): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async hasChainToRoot(p: HasChainToRootProps): Promise<boolean> {
    let msg = await this.findChildMessage({ id: p.id });
    msg?.parentMessageId;
  }
  getMessagesRecursiveByUser(
    p: GetMessagesRecursivePropsByUser
  ): Promise<Message[]> {
    throw new Error("Method not implemented.");
  }
}
