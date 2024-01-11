import { Message } from "../entities/Message";
import {
  DeleteMessageRecursiveProps,
  FindChildMessageProps,
  FindMessageProps,
  GetContinuousMessagesByUserProps,
  GetMessagesRecursiveByUserProps,
  HasChainToRootProps,
  MessageGatewayPort,
  PostMessageProps,
  RemoteParentMessageProps,
} from "../ports/MessageGatewayPort";

const messages: Message[] = [];

export class InMemoryMessageGateway implements MessageGatewayPort {
  async pollingChildMessage(p: { currentMessageId: number }): Promise<Message> {
    let childMsg: Message | undefined;
    let count = 0;
    while (!childMsg) {
      count++;
      // 一秒待機する
      await new Promise((res) => setTimeout(res, 1000));
      // 子メッセージがみつかるまでループし続ける
      childMsg = await this.findChildMessage({
        parentId: p.currentMessageId,
      });
      if (count > 300) {
        // 300回ループしても見つからなかったらループを抜ける
        throw new Error(
          `Polling child message timeout. : ${JSON.stringify(p)}`
        );
      }
    }
    return childMsg;
  }
  async removeParentMessage({ id }: RemoteParentMessageProps): Promise<void> {
    const msg = await this.findMessage({ id: id });
    if (msg) {
      delete msg.parentMessageId;
    }
  }
  async getContinuousMessagesByUser({
    fromMessageId,
  }: GetContinuousMessagesByUserProps): Promise<Message[]> {
    let msg = await this.findMessage({ id: fromMessageId });
    if (!msg) {
      throw new Error(`No such message id. : ${fromMessageId}`);
    }
    const results: Message[] = [msg];
    const userId = msg.userId;
    while (msg?.parentMessageId) {
      const parentMsg = await this.findMessage({ id: msg.parentMessageId });
      if (parentMsg?.userId === userId) {
        msg = parentMsg;
        results.push(msg);
      } else {
        // 同じユーザーの発言でなければループ終了
        msg = undefined;
      }
    }

    return results;
  }
  async postMessage(p: PostMessageProps): Promise<Message> {
    const roomMessages = messages.filter((msg) => msg.roomId === p.roomId);
    if (p.parentMessageId) {
      const parentMsg = await this.findMessage({ id: p.parentMessageId });
      if (parentMsg) {
        const childMsg = await this.findChildMessage({
          parentId: parentMsg.id,
        });
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
  findChildMessage({
    parentId,
  }: FindChildMessageProps): Promise<Message | undefined> {
    const childMsg = messages.find((msg) => msg.parentMessageId === parentId);
    return Promise.resolve(childMsg);
  }
  deleteMessageRecursive({ id }: DeleteMessageRecursiveProps): Promise<void> {
    const map = new Map(messages.map((msg) => [msg.id, msg]));
    let msg = map.get(id);
    while (msg) {
      const parentId = msg.parentMessageId;
      map.delete(msg.id);
      if (parentId) {
        msg = map.get(parentId);
      } else {
        msg = undefined;
      }
    }
    // messagesを上書き
    const newMessages = Array.from(map).map((val) => val[1]);
    messages.splice(0).push(...newMessages);
    return Promise.resolve();
  }
  async hasChainToRoot({ id }: HasChainToRootProps): Promise<boolean> {
    const map = new Map(messages.map((msg) => [msg.id, msg]));
    let msg = map.get(id);
    while (msg?.parentMessageId) {
      msg = map.get(msg.parentMessageId);
    }
    return Promise.resolve(!!msg?.isRoot);
  }
  getMessagesRecursiveByUser({
    filteringUserId,
    fromMessageId,
    textLimit,
  }: GetMessagesRecursiveByUserProps): Promise<Message[]> {
    const map = new Map(messages.map((msg) => [msg.id, msg]));
    let msg = map.get(fromMessageId);
    let textCount = 0;
    const resultMessages: Message[] = [];

    if (msg?.userId === filteringUserId) {
      resultMessages.push(msg);
      textCount += msg.content.length;
    }

    while (msg?.parentMessageId && textCount <= textLimit) {
      msg = map.get(msg.parentMessageId);
      if (msg?.userId === filteringUserId) {
        resultMessages.push(msg);
        textCount += msg.content.length;
      }
    }

    return Promise.resolve(resultMessages);
  }
}
