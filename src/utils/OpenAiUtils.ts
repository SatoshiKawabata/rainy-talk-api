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
    const completion = await openAi.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: reqParam.messages,
    });
    if (completion.choices[0].message?.content) {
      return completion.choices[0].message?.content;
    }
    throw new Error("No message content");
  } catch (e) {
    console.error("Failed to Open AI API request", e);
    throw e;
  }
};
