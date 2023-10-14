import { ChatRoom } from "../entities/ChatRoom";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
import { ChatRoomGatewayPort } from "../ports/ChatRoomGatewayPort";
import { PostMessageProps } from "../ports/MessageGatewayPort";
import { CreateUserProps, UserGatewayPort } from "../ports/UserGatewayPort";

type InitializeChatProps = {
  users: CreateUserProps[];
  chatRoomName: string;
};

export const initializeChat = async (
  p: InitializeChatProps,
  userGateway: UserGatewayPort,
  chatRoomGateway: ChatRoomGatewayPort
) => {
  // ユーザーの作成
  for (const user of p.users) {
    await userGateway.createUser(user);
  }
  const users = await Promise.all(
    p.users.map(async (user) => await userGateway.createUser(user))
  );
  // チャットルームの作成
  const room = await chatRoomGateway.createChatRoom({ name: p.chatRoomName });
  // チャットメンバーの追加
  await chatRoomGateway.addChatRoomMembers({
    roomId: room.id,
    userIds: users.map((user) => user.id),
  });
  return "success!";
};

// メッセージの投稿
const postMessage = (p: PostMessageProps) => {
  // p.parentMessageIdのメッセージが無ければ最初の投稿なので、そのままGatewayのメッセージの投稿メソッドを呼ぶ
  // p.parentMessageIdのメッセージがあれば子メッセージの紐づけを解除
  // Gatewayのメッセージの投稿メソッドを呼ぶ
  // メッセージを返す
};

// 次のメッセージを取得
type RequestNextMessageProps = {
  messageId: Message["id"];
  roomId: ChatRoom["id"];
};
const requestNextMessage = (p: RequestNextMessageProps) => {
  // DBにあれば返す
  // DBにない かつ 再帰処理中の場合、再帰処理を待って生成されたメッセージを返す
  // DBにない場合、次のメッセージを生成する再帰処理を起動
  // 再帰処理で生成したメッセージを返す
};

// 再帰処理を起動
type GenerateMessageRecursiveProps = {
  messageId: Message["id"];
};
const generateMessageRecursive = (p: GenerateMessageRecursiveProps) => {
  // 再帰処理をしているメッセージ(p.messageId)をGatewayに伝える
  // 現在のメッセージを取得
  // もう一方のAIのメッセージを文字数のリミットに達するまで再帰的に取得する
  // 上記メッセージをつなげる
  // ChatGPTに500文字以内で要約を要求
  // ChatGPTに次のメッセージの生成を要求(現在のメッセージが人の場合、人のメッセージも加味する)
  // メッセージ生成完了後、messageIdのメッセージの子メッセージを取得
  // 元のメッセージに子メッセージがあれば(割り込まれていれば)、エラーを返す
  // 親メッセージを辿っていき途切れている場合、一連のメッセージを全て削除して、エラーを返す
  // 上記いずれも当てはまらない場合、メッセージをGatewayに保存
  // メッセージを返す(最初の一回だけ)
  // 最新のmessageIdの再帰処理の終了を伝える
  // 上記を10回繰り返す
};
