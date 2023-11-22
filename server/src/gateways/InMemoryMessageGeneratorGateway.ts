import {
  GenerateProps,
  MessageGeneratorGatewayPort,
  SummarizeProps,
} from "../ports/MessageGeneratorGatewayPort";
import { createChatCompletion } from "../utils/openAiUtils";

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] || "";

export class InMemoryMessageGeneratorGateway
  implements MessageGeneratorGatewayPort
{
  summarize(p: SummarizeProps): Promise<string> {
    throw new Error("Method not implemented.");
  }
  generate({ infos }: GenerateProps): Promise<string> {
    // generateする
    // createChatCompletion(OPENAI_API_KEY, {
    //   messages:[
    //     {
    //       content:
    //     }
    //   ]
    // })
    throw new Error("Method not implemented.");
  }
}
