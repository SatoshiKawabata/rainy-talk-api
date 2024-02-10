import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

type RequestParam = {
  messages: ChatCompletionMessageParam[];
};

export const createChatCompletion = async (
  apiKey: string,
  reqParam: RequestParam
): Promise<string> => {
  const openAi = new OpenAI({
    apiKey,
  });
  try {
    const param = {
      model: "gpt-3.5-turbo-1106",
      messages: reqParam.messages,
    };
    console.log("openAi.chat.completions.create", JSON.stringify(param));
    const completion = await openAi.chat.completions.create(param);
    if (completion.choices[0].message?.content) {
      return completion.choices[0].message?.content;
    }
    throw new Error("No message content");
  } catch (e) {
    console.error("Failed to Open AI API request", e);
    throw e;
  }
};
