import { Message } from "../entities/Message";
import {
  IsRecursiveGeneratingProps,
  MessageSchedulerPort,
  SetIsRecursiveGeneratingProps,
} from "../ports/MessageSchedulerPort";

let recursiveGeneratingMessageIds: Message["id"][] = [];

export class InMemorySchedulerGateway implements MessageSchedulerPort {
  isRecursiveGenerating({
    currentMessageId,
  }: IsRecursiveGeneratingProps): Promise<boolean> {
    const isRecursive =
      recursiveGeneratingMessageIds.includes(currentMessageId);
    return Promise.resolve(isRecursive);
  }
  setIsRecursiveGenerating({
    currentMessageId,
    isGenerating,
  }: SetIsRecursiveGeneratingProps): Promise<void> {
    if (isGenerating) {
      recursiveGeneratingMessageIds.push(currentMessageId);
    } else {
      recursiveGeneratingMessageIds = recursiveGeneratingMessageIds.filter(
        (id) => id !== currentMessageId
      );
    }
    return Promise.resolve();
  }
}
