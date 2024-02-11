import { Message } from "../entities/Message";
import { ErrorCodes, UseCaseError } from "../errors/UseCaseError";
import { ChatRoomGatewayPort } from "../ports/ChatRoomGatewayPort";
import { MessageGatewayPort } from "../ports/MessageGatewayPort";
import { MessageGeneratorGatewayPort } from "../ports/MessageGeneratorGatewayPort";
import { MessageSchedulerPort } from "../ports/MessageSchedulerPort";
import { UserGatewayPort } from "../ports/UserGatewayPort";

// 再帰処理を起動
type GenerateMessageRecursiveProps = {
  currentMessageId: Message["messageId"];
  apiKey: string;
};
export const generateMessageRecursive = async (
  { currentMessageId, apiKey }: GenerateMessageRecursiveProps,
  messageGatewayPort: MessageGatewayPort,
  messageSchedulerPort: MessageSchedulerPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<{ nextMessage: Message }> => {
  // 再帰処理をしているメッセージ(p.messageId)をGatewayに伝える
  console.log("再帰処理をしているメッセージ(p.messageId)をGatewayに伝える", {
    currentMessageId,
  });
  await messageSchedulerPort.setIsRecursiveGenerating({
    currentMessageId,
    isGenerating: true,
  });

  // まずは最初のメッセージを生成
  console.log("まずは最初のメッセージを生成");
  const nextFirstMessage = await generateNextMsg(
    currentMessageId,
    apiKey,
    messageGatewayPort,
    chatRoomGatewayPort,
    userGatewayPort,
    messageGeneratorGatewayPort
  );

  // 10回生成処理を投げる(本関数では最初に生成されたメッセージを返すので、ループは待たない)
  console.log(
    "10回生成処理を投げる(本関数では最初に生成されたメッセージを返すので、ループは待たない)"
  );
  (async () => {
    let targetMsgId = nextFirstMessage.messageId;
    let i = 0;
    while (i < 10) {
      // 10回ループ
      console.log("10回ループ", i, "targetMsgId", targetMsgId);
      try {
        // 再帰処理をしているメッセージ(targetMsgId)をGatewayに伝える
        console.log(
          "再帰処理をしているメッセージ(targetMsgId)をGatewayに伝える"
        );
        await messageSchedulerPort.setIsRecursiveGenerating({
          currentMessageId: targetMsgId,
          isGenerating: true,
        });
        const msg = await generateNextMsg(
          targetMsgId,
          apiKey,
          messageGatewayPort,
          chatRoomGatewayPort,
          userGatewayPort,
          messageGeneratorGatewayPort
        );
        targetMsgId = msg.messageId;
        i++;
      } catch (err) {
        // エラーが発報されるとループ終了
        console.log("エラーが発報されるとループ終了");
        console.error(err);
        i = Number.MAX_VALUE;
      }
    }
    // ループが終了したら再帰処理を終了する
    console.log("ループが終了したら再帰処理を終了する");
    messageSchedulerPort.setIsRecursiveGenerating({
      currentMessageId: targetMsgId,
      isGenerating: false,
    });
  })();
  // 最初に生成したメッセージを返す
  console.log("最初に生成したメッセージを返す");
  return { nextMessage: nextFirstMessage };
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
  currentMsgId: Message["messageId"],
  apiKey: string,
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
  // Todo: 現在のメッセージから3つ遡ったときに、人の発言があればそれを取得する
  let humanContinuousMsgText: string | undefined = undefined;
  let currentAiUserId: number | undefined = currentMsgUser.userId; // AIの発言を要約するためのID(現在のメッセージの発言者のuserIdをまずは入れておく)
  if (!currentMsgUser.isAi) {
    const humanContinuousMsgs =
      await messageGatewayPort.getContinuousMessagesByUser({
        fromMessageId: currentMsgId,
      });
    // 人の発言を連結する
    humanContinuousMsgText = humanContinuousMsgs
      .map((msg) => msg.content)
      .join("\n");

    if (currentMsg.parentMessageId) {
      // 人の場合は前回のAIのメッセージの発言者のIDを指定する
      const parentMsg = await messageGatewayPort.findMessage({
        id: currentMsg.parentMessageId,
      });
      currentAiUserId = parentMsg?.userId;
    } else {
      // 親メッセージがない場合は適当なAIのメッセージの発言者のIDを指定する
      currentAiUserId = undefined;
    }
  }

  // 現在のAIのメッセージを文字数のリミットに達するまで再帰的に取得する
  const roomMembers = await chatRoomGatewayPort.getChatMembers({
    roomId: currentMsg.roomId,
  });
  // 現在のルームのAIのメンバーを取得
  const aiUserIds = (
    await userGatewayPort.getUsers({
      ids: roomMembers.map((m) => m.userId),
      isAiOnly: true,
    })
  ).map((u) => u.userId);
  const aiMembers = roomMembers.filter((m) => aiUserIds.includes(m.userId));
  if (!currentAiUserId) {
    // AIの発言を要約するためのIDがない場合、適当なAIのメッセージの発言者のIDを指定する
    currentAiUserId = aiMembers[0]?.userId;
  }
  const currentAiMember = aiMembers.find((m) => m.userId === currentAiUserId);
  console.log("currentAiMember", currentAiMember);
  if (!currentAiMember) {
    throw new UseCaseError(
      `member not found: ${currentAiUserId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const nextAiMember = aiMembers.find((m) => m.userId !== currentAiUserId);
  console.log("nextAiMember", nextAiMember);
  if (!nextAiMember) {
    throw new UseCaseError(
      `other member not found: ${JSON.stringify(aiMembers)}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const [currentAiUser] = await userGatewayPort.getUsers({
    ids: [currentAiUserId],
  });
  if (!currentAiUser) {
    throw new UseCaseError(
      `other user not found: userId=${currentAiUserId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const [nextAiUser] = await userGatewayPort.getUsers({
    ids: [nextAiMember.userId],
  });
  if (!nextAiUser) {
    throw new UseCaseError(
      `other user not found: userId=${nextAiMember.userId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  // 現在のAIのメッセージを要約するために取得
  const currentAiUserMsgs = await messageGatewayPort.getMessagesRecursiveByUser(
    {
      fromMessageId: currentMsg.messageId,
      filteringUserId: currentAiUserId,
      textLimit: 5000,
    }
  );
  // 最近の2件のメッセージは要約に含めない
  const currentAiUserMsgsWithoutLastTwo = [...currentAiUserMsgs];
  const lastTwoMsgs = currentAiUserMsgsWithoutLastTwo.slice(-2);
  // ChatGPTに500文字以内で要約を要求
  const summarizedAiMsg = await messageGeneratorGatewayPort.summarize({
    messages: currentAiUserMsgsWithoutLastTwo,
    // 現在のメッセージの発言者のSystemを指定
    gptSystem: currentAiMember?.gptSystem
      ? currentAiMember?.gptSystem
      : currentAiUser.originalGptSystem,
    apiKey,
  });
  // 要約の末尾に最近の2件のメッセージを追加
  const summarizedAiMsgWithLastTwo = `${summarizedAiMsg}\n${lastTwoMsgs
    .map((msg) => msg.content)
    .join("\n")}`;
  // ChatGPTに次のメッセージの生成を要求(現在のメッセージが人の場合、人のメッセージも加味する)
  const generatedMessage = await messageGeneratorGatewayPort.generate({
    apiKey,
    info: {
      // 次のメッセージの発言者のSystemを指定
      gptSystem: nextAiMember?.gptSystem
        ? nextAiMember?.gptSystem
        : nextAiUser.originalGptSystem,
      // 現在のメッセージの発言者の名前をpromptに入れるために指定
      userName: currentAiUser.name,
      aiMessageContent: summarizedAiMsgWithLastTwo,
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
    content: generatedMessage.content,
    userId: nextAiUser.userId,
    roomId: currentMsg.roomId,
  });
};
