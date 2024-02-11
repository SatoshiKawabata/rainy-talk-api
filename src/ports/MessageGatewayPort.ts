import { ChatRoom } from "../entities/ChatRoom";
import { Message } from "../entities/Message";
import { User } from "../entities/User";

export type PostMessageProps = {
  content: Message["content"];
  userId: Message["userId"];
  roomId: Message["roomId"];
  // 以下、rootのときは無し
  parentMessageId?: Message["parentMessageId"];
  parentMessagePosition?: number; // 0.0~1.0 親メッセージのどこまで発言されたか
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
  fromMessageId: Message["messageId"];
  /** フィルターするユーザーID */
  filteringUserId: User["userId"];
  /** 文字数のリミット */
  textLimit: number;
};

export type RemoteParentMessageProps = {
  /** このidのメッセージの親メッセージIDを削除 */
  id: number;
};

export type GetContinuousMessagesByUserProps = {
  /** 再起取得を始めるメッセージ */
  fromMessageId: Message["messageId"];
};

export type IsChainCountOfChildMessagesProps = {
  /** 再起取得を始めるメッセージ */
  fromMessageId: Message["messageId"];
  /** メッセージの数 */
  count: number;
};

export type IsChainCountOfChildMessagesResponse = {
  // 指定した数だけメッセージが存在しているかどうか
  isChainCount: boolean;
  // 末尾のメッセージID
  tailMessageId: Message["messageId"];
};

type PollingChildMessageProps = {
  currentMessageId: Message["messageId"];
};

export type GetMessagesByRoomIdProps = {
  roomId: ChatRoom["chatRoomId"];
};

export interface MessageGatewayPort {
  postMessage(p: PostMessageProps): Promise<Message>;
  findMessage(p: FindMessageProps): Promise<Message | undefined>;
  findChildMessage(p: FindChildMessageProps): Promise<Message | undefined>;
  /** 再帰的に親がなくなるまで削除していく */
  deleteMessageRecursive(p: DeleteMessageRecursiveProps): Promise<void>;
  hasChainToRoot(p: HasChainToRootProps): Promise<boolean>;
  /** 特定のユーザーのメッセージを再帰的に取得していく */
  getMessagesRecursiveByUser(
    p: GetMessagesRecursiveByUserProps
  ): Promise<Message[]>;
  /** メッセージの親子関係を解除 */
  removeParentMessage(p: RemoteParentMessageProps): Promise<void>;
  /** 同じユーザーの連続した発言を取得  */
  getContinuousMessagesByUser(
    p: GetContinuousMessagesByUserProps
  ): Promise<Message[]>;
  /** 対象の子メッセージが生成されるまで待つ */
  pollingChildMessage(p: PollingChildMessageProps): Promise<Message>;
  /** 子メッセージがcountまで存在するかどうか */
  hasChainCountOfChildMessages(
    p: IsChainCountOfChildMessagesProps
  ): Promise<IsChainCountOfChildMessagesResponse>;
  getMessagesByRoomId(p: GetMessagesByRoomIdProps): Promise<Message[]>;
}
