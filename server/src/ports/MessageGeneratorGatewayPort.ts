import { ChatRoomMember } from "../entities/ChatRoomMember";
import { Message } from "../entities/Message";
import { User } from "../entities/User";

type MessageInfo = {
  aiMessageContent: string; // メッセージの本文
  humanMessageContent?: string; // 人のメッセージ
  userName: User["name"];
  gptSystem: User["originalGptSystem"] | ChatRoomMember["gptSystem"];
};

type SummarizeProps = {
  messages: Message[];
};

type GenerateProps = {
  infos: MessageInfo[];
};

export interface MessageGeneratorGatewayPort {
  // ChatGPTに500文字以内で要約を要求
  summarize(p: SummarizeProps): Promise<string>;
  // ChatGPTに次のメッセージの生成を要求(現在のメッセージが人の場合、人のメッセージも加味する)
  generate(p: GenerateProps): Promise<string>;
}
