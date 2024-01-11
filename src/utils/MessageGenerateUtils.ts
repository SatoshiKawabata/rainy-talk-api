import { Message } from "../entities/Message";
import { ErrorCodes, UseCaseError } from "../errors/UseCaseError";
import { ChatRoomGatewayPort } from "../ports/ChatRoomGatewayPort";
import { MessageGatewayPort } from "../ports/MessageGatewayPort";
import { MessageGeneratorGatewayPort } from "../ports/MessageGeneratorGatewayPort";
import { MessageSchedulerPort } from "../ports/MessageSchedulerPort";
import { UserGatewayPort } from "../ports/UserGatewayPort";

// 再帰処理を起動
type GenerateMessageRecursiveProps = {
  currentMessageId: Message["id"];
};
export const generateMessageRecursive = async (
  { currentMessageId }: GenerateMessageRecursiveProps,
  messageGatewayPort: MessageGatewayPort,
  messageSchedulerPort: MessageSchedulerPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<{ nextMessage: Message }> => {
  // 再帰処理をしているメッセージ(p.messageId)をGatewayに伝える
  await messageSchedulerPort.setIsRecursiveGenerating({
    currentMessageId,
    isGenerating: true,
  });

  // まずは最初のメッセージを生成
  const nextMessage = await generateNextMsg(
    currentMessageId,
    messageGatewayPort,
    chatRoomGatewayPort,
    userGatewayPort,
    messageGeneratorGatewayPort
  );

  // 10回生成処理を投げる(本関数では最初に生成されたメッセージを返すので、ループは待たない)
  (async () => {
    let targetMsgId = currentMessageId;
    let i = 0;
    while (i < 10) {
      // 10回ループ
      try {
        // 再帰処理をしているメッセージ(targetMsgId)をGatewayに伝える
        await messageSchedulerPort.setIsRecursiveGenerating({
          currentMessageId: targetMsgId,
          isGenerating: true,
        });
        const msg = await generateNextMsg(
          targetMsgId,
          messageGatewayPort,
          chatRoomGatewayPort,
          userGatewayPort,
          messageGeneratorGatewayPort
        );
        targetMsgId = msg.id;
        i++;
      } catch (err) {
        // エラーが発報されるとループ終了
        console.error(err);
        i = Number.MAX_VALUE;
      }
    }
    // ループが終了したら再帰処理を終了する
    messageSchedulerPort.setIsRecursiveGenerating({
      currentMessageId: targetMsgId,
      isGenerating: false,
    });
  })();
  // 最初に生成したメッセージを返す
  return { nextMessage };
};

/**
 * メッセージを生成する
 * エラーが発報すると終了
 * @param currentMsgId // 現在のAIのメッセージのID
 * @param messageGatewayPort
 * @param chatRoomGatewayPort
 * @param userGatewayPort
 * @param messageGeneratorGatewayPort
 */
const generateNextMsg = async (
  currentMsgId: Message["id"],
  messageGatewayPort: MessageGatewayPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<Message> => {
  // 現在のメッセージを取得
  const currentMsg = await messageGatewayPort.findMessage({
    id: currentMsgId,
  });
  if (!currentMsg) {
    throw new UseCaseError(
      `message not found: targetMsgId=${currentMsgId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  // 現在のメッセージの発言者を取得
  const [currentMsgUser] = await userGatewayPort.getUsers({
    ids: [currentMsg.userId],
  });
  if (!currentMsgUser) {
    throw new UseCaseError(
      `user not found: targetMsgId=${currentMsgId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  // 現在のメッセージの発言者が人の場合、人の発言を再帰的に取得
  let humanContinuousMsgText: string | undefined = undefined;
  if (!currentMsgUser.isAi) {
    const humanContinuousMsgs =
      await messageGatewayPort.getContinuousMessagesByUser({
        fromMessageId: currentMsgId,
      });
    // 人の発言を連結する
    humanContinuousMsgText = humanContinuousMsgs
      .map((msg) => msg.content)
      .join("\n");
  }

  // 現在のメッセージのAIのメッセージを文字数のリミットに達するまで再帰的に取得する
  const roomMembers = await chatRoomGatewayPort.getChatMembers({
    roomId: currentMsg.roomId,
  });
  const aiUserIds = (
    await userGatewayPort.getUsers({ ids: roomMembers.map((m) => m.userId) })
  )
    .filter((user) => user.isAi)
    .map((u) => u.id);
  const aiMembers = roomMembers.filter((m) => aiUserIds.includes(m.userId));
  const currentMember = aiMembers.find((m) => m.userId === currentMsgUser.id);
  if (!currentMember) {
    throw new UseCaseError(
      `member not found: ${currentMsgUser.id}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const nextMember = aiMembers.find((m) => m.userId !== currentMsgUser.id);
  if (!nextMember) {
    throw new UseCaseError(
      `other member not found: ${JSON.stringify(aiMembers)}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const currentAiUserMsgs = await messageGatewayPort.getMessagesRecursiveByUser(
    {
      fromMessageId: currentMsg.id,
      filteringUserId: currentMsgUser.id,
      textLimit: 5000,
    }
  );
  // ChatGPTに500文字以内で要約を要求
  const summarizedAiMsg = await messageGeneratorGatewayPort.summarize({
    messages: currentAiUserMsgs,
  });
  // ChatGPTに次のメッセージの生成を要求(現在のメッセージが人の場合、人のメッセージも加味する)
  const generatedText = await messageGeneratorGatewayPort.generate({
    info: {
      gptSystem: currentMember?.gptSystem
        ? currentMember?.gptSystem
        : currentMsgUser.originalGptSystem,
      userName: currentMsgUser.name,
      aiMessageContent: summarizedAiMsg,
      humanMessageContent: humanContinuousMsgText,
    },
  });
  // メッセージ生成中に割り込まれていないかの判定処理(メッセージ生成完了後、messageIdのメッセージの子メッセージを取得)
  const isInterrupted = await messageGatewayPort.findChildMessage({
    parentId: currentMsgId,
  });
  // 元のメッセージに子メッセージがあれば(割り込まれていれば)、エラーを発報
  if (isInterrupted) {
    throw new UseCaseError(
      `Tried to generate the next message but the message already has child: targetMsgId=${currentMsgId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  // 親メッセージを辿っていき途切れている場合、一連のメッセージを全て削除して、エラーを発報
  const isContinuing = await messageGatewayPort.hasChainToRoot({
    id: currentMsgId,
  });
  if (!isContinuing) {
    await messageGatewayPort.deleteMessageRecursive({
      id: currentMsgId,
    });
    throw new UseCaseError(
      `Tried to generate the next message but the message has no chain to root: ${currentMsgId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  // 生成したメッセージを保存する
  return await messageGatewayPort.postMessage({
    parentMessageId: currentMsgId,
    content: generatedText,
    userId: currentMsgUser.id,
    roomId: currentMsg.roomId,
  });
};
