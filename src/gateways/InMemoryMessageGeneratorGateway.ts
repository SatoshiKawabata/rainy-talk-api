import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  GenerateProps,
  MessageGeneratorGatewayPort,
  SummarizeProps,
} from "../ports/MessageGeneratorGatewayPort";
import { createChatCompletion } from "../utils/OpenAiUtils";
import "dotenv/config";

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] || "";
const MAX_TEXT_COUNT_TO_SUMMARIZE = 500;

export class InMemoryMessageGeneratorGateway
  implements MessageGeneratorGatewayPort
{
  summarize({ messages }: SummarizeProps): Promise<string> {
    const joinedMessage = messages.map((msg) => msg.content).join(`
`);
    if (joinedMessage.length <= MAX_TEXT_COUNT_TO_SUMMARIZE) {
      return Promise.resolve(joinedMessage);
    }

    return createChatCompletion(OPENAI_API_KEY, {
      messages: [
        {
          content: `次の文章を${MAX_TEXT_COUNT_TO_SUMMARIZE}文字以内で要約してください。:
${joinedMessage}`,
          role: "user",
        },
      ],
    });
  }

  generate({ info }: GenerateProps): Promise<string> {
    // generateする
    const messages: ChatCompletionMessageParam[] = [
      {
        content: info.gptSystem,
        role: "system",
      },
      {
        content: createAiPrompt(info.userName, info.aiMessageContent),
        role: "assistant",
      },
    ];
    if (info.humanMessageContent) {
      messages.push({
        content: info.humanMessageContent,
        role: "user",
      });
    }
    return createChatCompletion(OPENAI_API_KEY, {
      messages,
    });
  }
}

const createAiPrompt = (userName: string, content: string) => {
  return `
${userName}さんが
「${content}」と言っています。
それに対する反論を書いてください。
その際に以下のルールを守ってください。
・160文字程度で書いてください。
・自分のエゴを全面に押し出してください。
・簡潔に反論だけを述べてください。
・自然な会話の流れを保ってください。
・口語口調で書いてください。
・相手の論理の虚を突いてください。
・相手の揚げ足を取ってください。

以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答ください。
{
  "target": "${userName}",
  "content": "{あなたの反論}"
}

    `;
};
