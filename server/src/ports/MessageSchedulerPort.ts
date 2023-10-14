import { Message } from "../entities/Message";

export type FetchMessageProps = {
  currentMessageId: Message["id"];
};

export type IsRecursiveGeneratingProps = {
  currentMessageId: Message["id"];
};

export type SetIsRecursiveGeneratingProps = {
  currentMessageId: Message["id"];
  isRecursive: boolean;
};

export interface MessageSchedulerPort {
  start(): Promise<void>;
  /** 特定のidの次のメッセージの生成を待って返す */
  fetchNextMessage(p: FetchMessageProps): Promise<Message>;
  /** 特定のメッセージが再帰処理を行っているか */
  isRecursiveGenerating(p: IsRecursiveGeneratingProps): Promise<boolean>;
  /** 再帰処理を行っているメッセージを設定する */
  setIsRecursiveGenerating(p: SetIsRecursiveGeneratingProps): Promise<void>;
}
