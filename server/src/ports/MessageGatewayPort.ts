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
  parentId: number;
};

export type DeleteMessageRecursiveProps = {
  /** このidのメッセージから親を辿っていき全て削除 */
  id: number;
};

export type HasChainToRootProps = {
  /** このidのメッセージから親を辿っていきRootのメッセージにつながるかどうか */
  id: number;
};

export type GetMessagesRecursiveByUserProps = {
  /** 再起取得を始めるメッセージ */
  fromMessageId: Message["id"];
  /** フィルターするユーザーID */
  filteringUserId: User["id"];
  /** 文字数のリミット */
  textLimit: number;
};

type RemoteParentMessageProps = {
  /** このidのメッセージの親メッセージIDを削除 */
  id: number;
};

type GetContinuousMessagesByUserProps = {
  /** 再起取得を始めるメッセージ */
  fromMessageId: Message["id"];
};

export interface MessageGatewayPort {
  postMessage(p: PostMessageProps): Promise<Message>;
  findMessage(p: FindMessageProps): Promise<Message | undefined>;
  findChildMessage(p: FindChildMessageProps): Promise<Message | undefined>;
  deleteMessageRecursive(p: DeleteMessageRecursiveProps): Promise<void>;
  hasChainToRoot(p: HasChainToRootProps): Promise<boolean>;
  /** 特定のユーザーのメッセージを再帰的に取得していく */
  getMessagesRecursiveByUser(
    p: GetMessagesRecursiveByUserProps
  ): Promise<Message[]>;
  /** 特定のユーザーのメッセージを再帰的に削除していく */
  deleteMessagesRecursiveByUser(
    p: GetMessagesRecursiveByUserProps
  ): Promise<Message[]>;
  /** メッセージの親子関係を解除 */
  removeParentMessage(p: RemoteParentMessageProps): Promise<void>;
  /** 同じユーザーの連続した発言を取得  */
  getContinuousMessagesByUser(
    p: GetContinuousMessagesByUserProps
  ): Promise<Message[]>;
}
