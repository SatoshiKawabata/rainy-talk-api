import { Message } from "../entities/Message";
import { MessageGeneratorGatewayPort } from "../ports/MessageGeneratorGatewayPort";

export class InMemoryMessageGeneratorGateway
  implements MessageGeneratorGatewayPort
{
  summarize(p: { messages: Message[] }): Promise<string> {
    throw new Error("Method not implemented.");
  }
  generate(p: {
    infos: {
      aiMessageContent: string;
      humanMessageContent?: string | undefined;
      userName: string;
      gptSystem: string;
    }[];
  }): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
