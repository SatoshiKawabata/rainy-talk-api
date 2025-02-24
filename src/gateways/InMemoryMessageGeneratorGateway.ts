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

const MAX_TEXT_COUNT_TO_SUMMARIZE = 2000;

export class InMemoryMessageGeneratorGateway
  implements MessageGeneratorGatewayPort
{
  summarize({
    messages,
    apiKey,
    gptSystem,
    model,
  }: SummarizeProps): Promise<string> {
    const joinedMessage = messages.map((msg) => msg.content).join(`
`);
    if (joinedMessage.length <= MAX_TEXT_COUNT_TO_SUMMARIZE) {
      return Promise.resolve(joinedMessage);
    }

    return createChatCompletion(
      apiKey,
      {
        messages: [
          {
            content: gptSystem,
            role: "system",
          },
          {
            content: `次の文章は過去のあなたの発言を集めたものです。${MAX_TEXT_COUNT_TO_SUMMARIZE}文字以内で要約してあなたらしい発言をしてください。: ${joinedMessage}`,
            role: "user",
          },
        ],
      },
      model
    );
  }

  async generate({
    info,
    apiKey,
    model,
  }: GenerateProps): Promise<GenerateResponse> {
    // generateする
    const messages: ChatCompletionMessageParam[] = [
      {
        content: info.gptSystem,
        role: "system",
      },
      {
        content: createAiPrompt(
          info.targetUserName,
          info.messages,
          info.selfUserName
        ),
        role: "user",
      },
    ];
    const txt = await createChatCompletion(
      apiKey,
      {
        messages,
      },
      model
    );

    try {
      return extractJSON(txt);
    } catch (e) {
      return {
        target: info.targetUserName,
        content: txt,
      };
    }
  }
  async generateWithHuman({
    info,
    apiKey,
    model,
  }: GenerateProps): Promise<GenerateResponse> {
    // generateする
    const messages: ChatCompletionMessageParam[] = [
      {
        content: info.gptSystem,
        role: "system",
      },
      {
        content: createAiPromptWithHuman(
          info.messages,
          info.targetUserName,
          info.selfUserName,
          info.humanName
        ),
        role: "user",
      },
    ];
    const txt = await createChatCompletion(
      apiKey,
      {
        messages,
      },
      model
    );

    try {
      return extractJSON(txt);
    } catch (e) {
      return {
        target: info.targetUserName,
        content: txt,
      };
    }
  }
}

const createAiPromptWithHuman = (
  messages: GenerateProps["info"]["messages"],
  targetUserName: string,
  selfUserName: string,
  humanName: string
) => {
  return `あなたは${selfUserName}です。あなた(${selfUserName})は${targetUserName}さんと、${humanName}という名前のもう一人の会話の参加者の人と会話をしています。
これまでの会話の流れは以下です。
${messages.map((msg) => `${msg.userName}の発言「${msg.content}」`).join("\n")}

この後にあなた(${selfUserName})が参加者の人(${humanName})に対して返答してください。

以下の5パターンのうち合致する条件で返答してください。
・もし参加者の人(${humanName})があなた(${selfUserName})の立場に近い場合、参加者の人(${humanName})の意見に同調してください。
・もし参加者の人(${humanName})が${targetUserName}さんの立場に近い場合、参加者の人(${humanName})に反論してください。
・もし参加者の人(${humanName})の発言が関係ない話題の場合、その内容に言及した上で反論してください。
・もし参加者の人(${humanName})の発言が不適切な場合、その旨を伝えた上で反論してください。
・もし参加者の人(${humanName})の発言があなた(${selfUserName})への質問である場合、その質問に答えてください。

その際に以下のルールを守ってください。
・160文字程度で書いてください。
・自然な会話の流れを保ってください。
・口語口調で書いてください。

必ず以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答ください。
{
  "target": "${humanName}",
  "content": "{あなた(${selfUserName})の反論}"
}`;
};

const createAiPrompt = (
  targetUserName: string,
  messages: GenerateProps["info"]["messages"],
  selfUserName: string
) => {
  return `あなたは${selfUserName}です。あなた(${selfUserName})は${targetUserName}さんと会話をしています。
これまでの会話の流れは以下です。
${messages.map((msg) => `${msg.userName}の発言「${msg.content}」`).join("\n")}

この後にあなた(${selfUserName})が反論します。

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
  "target": "${targetUserName}",
  "content": "{あなた(${selfUserName})の反論}"
}
`;
};
