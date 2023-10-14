import { Message } from "../entities/Message";
import { User } from "../entities/User";

export type PostMessageProps = {
  parentMessageId?: Message["parentMessageId"];
  content: Message["content"];
  userId: Message["userId"];
  roomId: Message["roomId"];
};

export type FindMessageProps = {
  id: number;
};

export type FindChildMessageProps = {
  /** このidのメッセージの子メッセージを探す */
  id: number;
};

export type DeleteMessageRecursiveProps = {
  /** このidのメッセージから親を辿っていき全て削除 */
  id: number;
};

export type HasChainToRootProps = {
  /** このidのメッセージから親を辿っていきRootのメッセージにつながるかどうか */
  id: number;
};

export type GetMessagesRecursivePropsByUser = {
  /** 再起取得を始めるメッセージ */
  fromMessageId: Message["id"];
  /** フィルターするユーザーID */
  filteringUserId: User["id"];
  /** 再帰の回数 */
  limit: number;
};

export interface MessageGatewayPort {
  postMessage(p: PostMessageProps): Promise<Message>;
  findMessage(p: FindMessageProps): Promise<Message | undefined>;
  findChildMessage(p: FindChildMessageProps): Promise<Message | undefined>;
  deleteMessageRecursive(p: DeleteMessageRecursiveProps): Promise<void>;
  hasChainToRoot(p: HasChainToRootProps): Promise<boolean>;
  /** 特定のユーザーのメッセージを再帰的に取得していく */
  getMessagesRecursiveByUser(
    p: GetMessagesRecursivePropsByUser
  ): Promise<Message[]>;
}
