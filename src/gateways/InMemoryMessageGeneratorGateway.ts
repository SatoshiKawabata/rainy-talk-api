import { ChatCompletionMessageParam } from "openai/resources";
import {
  GenerateProps,
  GenerateResponse,
  MessageGeneratorGatewayPort,
  SummarizeProps,
} from "../ports/MessageGeneratorGatewayPort";
import { createChatCompletion } from "../utils/OpenAiUtils";
import "dotenv/config";
import { extractJSON } from "../utils/stringUtils";

const MAX_TEXT_COUNT_TO_SUMMARIZE = 500;

export class InMemoryMessageGeneratorGateway
  implements MessageGeneratorGatewayPort
{
  summarize({ messages, apiKey }: SummarizeProps): Promise<string> {
    const joinedMessage = messages.map((msg) => msg.content).join(`
`);
    if (joinedMessage.length <= MAX_TEXT_COUNT_TO_SUMMARIZE) {
      return Promise.resolve(joinedMessage);
    }

    return createChatCompletion(apiKey, {
      messages: [
        {
          content: `次の文章を${MAX_TEXT_COUNT_TO_SUMMARIZE}文字以内で要約してください。:
${joinedMessage}`,
          role: "user",
        },
      ],
    });
  }

  async generate({ info, apiKey }: GenerateProps): Promise<GenerateResponse> {
    // generateする
    const messages: ChatCompletionMessageParam[] = [
      {
        content: info.gptSystem,
        role: "system",
      },
      {
        content: createAiPrompt(
          info.userName,
          info.aiMessageContent,
          info.humanMessageContent
        ),
        role: "user",
      },
    ];
    const txt = await createChatCompletion(apiKey, {
      messages,
    });

    try {
      return extractJSON(txt);
    } catch (e) {
      return {
        target: info.userName,
        content: txt,
      };
    }
  }
}

const createAiPrompt = (
  userName: string,
  content: string,
  humanContent?: string
) => {
  return humanContent
    ? `
    ${userName}さんが
    「${content}」と言っています。
    人間が「${humanContent}」と言ってます。
    ${userName}さんの意見をふまえて人間に対する反論を書いてください。
    その際に以下のルールを守ってください。
    ・160文字程度で書いてください。
    ・自分のエゴを全面に押し出してください。
    ・簡潔に反論だけを述べてください。
    ・自然な会話の流れを保ってください。
    ・口語口調で書いてください。
    ・相手の論理の虚を突いてください。
    ・相手の揚げ足を取ってください。
    
    必ず以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答ください。
    {
      "target": "人間",
      "content": "{あなたの反論}"
    }
    
`
    : `
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

必ず以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答ください。
{
  "target": "${userName}",
  "content": "{あなたの反論}"
}

`;
};

/*

人間の後の3発言くらいは人間の発言を加味する

人間の発言のときにparentMessageIdの発言の何割再生したかを一緒に送ってもらう
- 50%未満なら切る → その場合はparentMessageIdの発言はなかったことになる
- それか、%分だけ削るか → その場合はparentMessageIdの発言の途中までになる

APIドキュメントを更新する

*/
