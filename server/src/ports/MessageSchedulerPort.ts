import { Message } from "../entities/Message";

export type IsRecursiveGeneratingProps = {
  currentMessageId: Message["id"];
};

export type SetIsRecursiveGeneratingProps = {
  currentMessageId: Message["id"];
  isGenerating: boolean;
};

export interface MessageSchedulerPort {
  /** 特定のメッセージが再帰処理を行っているか */
  isRecursiveGenerating(p: IsRecursiveGeneratingProps): Promise<boolean>;
  /** 再帰処理を行っているメッセージを設定する(現在の再帰処理はキャンセルする) */
  setIsRecursiveGenerating(p: SetIsRecursiveGeneratingProps): Promise<void>;
}
