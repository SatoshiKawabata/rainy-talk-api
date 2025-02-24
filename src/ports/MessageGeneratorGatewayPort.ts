import { ChatRoomMember } from "../entities/ChatRoomMember";
import { Message } from "../entities/Message";
import { User } from "../entities/User";

type MessageInfo = {
  messages: {
    content: string;
    userName: User["name"];
  }[];
  targetUserName: User["name"];
  selfUserName: User["name"];
  humanName: User["name"];
  gptSystem: User["originalGptSystem"] | ChatRoomMember["gptSystem"];
};

export type SummarizeProps = {
  messages: Message[];
  gptSystem: string;
  apiKey: string;
  model: string;
};

export type GenerateProps = {
  info: MessageInfo;
  apiKey: string;
  model: string;
};

export type GenerateResponse = {
  target: string;
  content: string;
};

export interface MessageGeneratorGatewayPort {
  // ChatGPTに500文字以内で要約を要求
  summarize(p: SummarizeProps): Promise<string>;
  // ChatGPTに次のメッセージの生成を要求
  generate(p: GenerateProps): Promise<GenerateResponse>;
  // ChatGPTに次のメッセージの生成を要求(人のメッセージも加味する)
  generateWithHuman(p: GenerateProps): Promise<GenerateResponse>;
}
