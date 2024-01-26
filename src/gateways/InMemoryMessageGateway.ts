import { Message } from "../entities/Message";
import {
  DeleteMessageRecursiveProps,
  FindChildMessageProps,
  FindMessageProps,
  GetContinuousMessagesByUserProps,
  GetMessagesRecursiveByUserProps,
  IsChainCountOfChildMessagesProps,
  HasChainToRootProps,
  MessageGatewayPort,
  PostMessageProps,
  RemoteParentMessageProps,
  IsChainCountOfChildMessagesResponse,
} from "../ports/MessageGatewayPort";

const messages: Message[] = [];
export class InMemoryMessageGateway implements MessageGatewayPort {
  async hasChainCountOfChildMessages({
    fromMessageId,
    count,
  }: IsChainCountOfChildMessagesProps): Promise<IsChainCountOfChildMessagesResponse> {
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));

    let msg = map.get(fromMessageId);
    if (!msg) {
      throw new Error(`No such message id. : ${fromMessageId}`);
    }
    let cnt = 0;

    while (cnt < count) {
      const child = await this.findChildMessage({ parentId: msg.messageId });
      if (child) {
        msg = child;
        cnt++;
      } else {
        break;
      }
    }

    return {
      isChainCount: cnt >= count,
      tailMessageId: msg?.messageId,
    };
  }
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
    console.log("親メッセージとのチェーンを削除", { id });
    const msg = await this.findMessage({ id });
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
          parentId: parentMsg.messageId,
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
    } else if (roomMessages.length > 0 && p.parentMessageId == null) {
      // 既にメッセージが投稿されているので親メッセージを設定しないといけない
      throw new Error(
        `parentMessageId is necessary when there are some messages. : ${JSON.stringify(
          p
        )}`
      );
    }
    const newMessageId =
      messages.length === 0
        ? 0
        : messages.reduce((acc, cur) => {
            return Math.max(acc, cur.messageId);
          }, 0) + 1;
    const newMessage: Message = {
      content: p.content,
      messageId: newMessageId,
      isRoot: roomMessages.length === 0,
      roomId: p.roomId,
      userId: p.userId,
      parentMessageId: p.parentMessageId,
    };
    messages.push(newMessage);
    console.log("push messages", messages);
    return Promise.resolve(newMessage);
  }
  findMessage(p: FindMessageProps): Promise<Message | undefined> {
    const msg = messages.find((msg) => msg.messageId === p.id);
    return Promise.resolve(msg);
  }
  findChildMessage({
    parentId,
  }: FindChildMessageProps): Promise<Message | undefined> {
    const childMsg = messages.find((msg) => msg.parentMessageId === parentId);
    return Promise.resolve(childMsg);
  }
  deleteMessageRecursive({ id }: DeleteMessageRecursiveProps): Promise<void> {
    console.log("削除スタート", messages);
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));
    console.log("map", map);
    let msg = map.get(id);
    while (msg) {
      console.log("msg", msg);
      const parentId = msg.parentMessageId;
      map.delete(msg.messageId);
      if (parentId) {
        msg = map.get(parentId);
      } else {
        msg = undefined;
      }
    }
    console.log("map", map);
    // messagesを上書き
    const newMessages = Array.from(map).map((val) => val[1]);
    console.log("newMessages", newMessages);
    messages.splice(0);
    messages.push(...newMessages);
    console.log("メッセージを削除", { id }, messages);
    return Promise.resolve();
  }
  async hasChainToRoot({ id }: HasChainToRootProps): Promise<boolean> {
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));
    let msg = map.get(id);
    while (typeof msg?.parentMessageId === "number") {
      msg = map.get(msg.parentMessageId);
    }
    return !!msg?.isRoot;
  }
  getMessagesRecursiveByUser({
    filteringUserId,
    fromMessageId,
    textLimit,
  }: GetMessagesRecursiveByUserProps): Promise<Message[]> {
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));
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
