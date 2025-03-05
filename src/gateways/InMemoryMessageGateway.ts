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
  GetMessagesByRoomIdProps,
  GetMessagesRecursiveByHumanProps,
} from "../ports/MessageGatewayPort";
import logger from "../utils/logger";

const messages: Message[] = [];
let newMessageId = 0;
export class InMemoryMessageGateway implements MessageGatewayPort {
  async getMessagesRecursive({
    recursiveCount,
    fromMessageId,
  }: GetMessagesRecursiveByHumanProps): Promise<Message[]> {
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));

    let msg = map.get(fromMessageId);
    if (!msg) {
      throw new Error(`No such message id. : ${fromMessageId}`);
    }
    let cnt = 1;
    const results = [msg];

    while (cnt < recursiveCount) {
      if (!msg?.parentMessageId) {
        break;
      }
      const parent = map.get(msg.parentMessageId);
      if (parent) {
        results.push(parent);
        msg = parent;
      } else {
        break;
      }
      cnt++;
    }

    return results;
  }
  async getMessagesByRoomId(p: GetMessagesByRoomIdProps): Promise<Message[]> {
    return messages.filter((msg) => msg.roomId === p.roomId);
  }
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
    logger.info("親メッセージとのチェーンを削除", { id });
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
        if (p.parentMessagePosition) {
          // 親メッセージをp.parentMessagePositionの割合で切り取る
          const parentMsgContent = parentMsg.content;
          const parentMsgLength = parentMsgContent.length;
          const cutPosition = Math.ceil(
            parentMsgLength * p.parentMessagePosition
          );
          const newContent = parentMsgContent.slice(0, cutPosition);
          parentMsg.content = newContent;
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
    const newMessage: Message = {
      content: p.content,
      messageId: newMessageId,
      isRoot: roomMessages.length === 0,
      roomId: p.roomId,
      userId: p.userId,
      parentMessageId: p.parentMessageId,
    };
    messages.push(newMessage);
    logger.info("新しいメッセージを追加", { message: newMessage });
    newMessageId++;
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
  async deleteMessageRecursive({
    id,
  }: DeleteMessageRecursiveProps): Promise<void> {
    logger.info("メッセージの削除を開始", { messages });
    const map = new Map(messages.map((msg) => [msg.messageId, msg]));
    logger.debug("メッセージマップを作成", { map });
    let msg = map.get(id);
    while (msg) {
      logger.debug("メッセージを処理中", { message: msg });
      const parentId = msg.parentMessageId;
      map.delete(msg.messageId);
      if (parentId) {
        msg = map.get(parentId);
      } else {
        msg = undefined;
      }
    }
    logger.debug("削除後のメッセージマップ", { map });
    // messagesを上書き
    const newMessages = Array.from(map).map((val) => val[1]);
    logger.debug("新しいメッセージ配列", { messages: newMessages });
    messages.splice(0);
    messages.push(...newMessages);
    logger.info("メッセージを削除完了", { id, remainingMessages: messages });
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
