import { Message } from "../entities/Message";
import { ErrorCodes, UseCaseError } from "../errors/UseCaseError";
import { ChatRoomGatewayPort } from "../ports/ChatRoomGatewayPort";
import { MessageGatewayPort } from "../ports/MessageGatewayPort";
import {
  GenerateProps,
  GenerateResponse,
  MessageGeneratorGatewayPort,
} from "../ports/MessageGeneratorGatewayPort";
import { MessageSchedulerPort } from "../ports/MessageSchedulerPort";
import { UserGatewayPort } from "../ports/UserGatewayPort";
import logger from "./logger";

// 再帰処理を起動
type GenerateMessageRecursiveProps = {
  currentMessageId: Message["messageId"];
  apiKey: string;
  model: string;
};
export const generateMessageRecursive = async (
  { currentMessageId, apiKey, model }: GenerateMessageRecursiveProps,
  messageGatewayPort: MessageGatewayPort,
  messageSchedulerPort: MessageSchedulerPort,
  chatRoomGatewayPort: ChatRoomGatewayPort,
  userGatewayPort: UserGatewayPort,
  messageGeneratorGatewayPort: MessageGeneratorGatewayPort
): Promise<{ nextMessage: Message }> => {
  // 再帰処理をしているメッセージ(p.messageId)をGatewayに伝える
  logger.info("再帰処理をしているメッセージ(p.messageId)をGatewayに伝える", {
    currentMessageId,
  });
  await messageSchedulerPort.setIsRecursiveGenerating({
    currentMessageId,
    isGenerating: true,
  });

  // まずは最初のメッセージを生成
  logger.info("まずは最初のメッセージを生成");
  const nextFirstMessage = await generateNextMsg(
    currentMessageId,
    apiKey,
    model,
    messageGatewayPort,
    chatRoomGatewayPort,
    userGatewayPort,
    messageGeneratorGatewayPort
  );

  // 10回生成処理を投げる(本関数では最初に生成されたメッセージを返すので、ループは待たない)
  logger.info(
    "10回生成処理を投げる(本関数では最初に生成されたメッセージを返すので、ループは待たない)"
  );
  (async () => {
    let targetMsgId = nextFirstMessage.messageId;
    let i = 0;
    const LOOP_COUNT = 10;
    while (i < LOOP_COUNT) {
      logger.debug(`${LOOP_COUNT} 回ループする`, {
        iteration: i,
        targetMsgId,
      });
      try {
        // 再帰処理をしているメッセージ(targetMsgId)をGatewayに伝える
        logger.info(
          "再帰処理をしているメッセージ(targetMsgId)をGatewayに伝える"
        );
        await messageSchedulerPort.setIsRecursiveGenerating({
          currentMessageId: targetMsgId,
          isGenerating: true,
        });
        const msg = await generateNextMsg(
          targetMsgId,
          apiKey,
          model,
          messageGatewayPort,
          chatRoomGatewayPort,
          userGatewayPort,
          messageGeneratorGatewayPort
        );
        targetMsgId = msg.messageId;
        i++;
      } catch (err) {
        // エラーが発報されるとループ終了
        logger.error("エラーが発生したためループが終了した", {
          error: err,
          iteration: i,
          targetMsgId,
        });
        i = Number.MAX_VALUE;
      }
    }
    // ループが終了したら再帰処理を終了する
    logger.info("ループが完了したので再帰処理を終了する", { targetMsgId });
    messageSchedulerPort.setIsRecursiveGenerating({
      currentMessageId: targetMsgId,
      isGenerating: false,
    });
  })();
  // 最初に生成したメッセージを返す
  logger.info("最初に生成したメッセージを返す");
  return { nextMessage: nextFirstMessage };
};

const MAX_RECURSIVE_COUNT = 7;

/**
 * メッセージを生成する
 * 最新 {MAX_RECURSIVE_COUNT} 件の会話をそのままに、それ以前の相手のAIの発言を要約して、
 * その要約と最新10件の会話をもとにChatGPTに次のメッセージの生成を要求する
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
  model: string,
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
  // 現在のメッセージから3つ遡ったときに、人の発言があればそれを取得して加味する
  let humanContinuousMsgText: string | undefined = undefined;
  // 現在のメッセージのルームのメンバーを取得
  const currentChatRoomUserIds = (
    await chatRoomGatewayPort.getChatMembers({ roomId: currentMsg.roomId })
  ).map((m) => m.userId);

  // 直近の {MAX_RECURSIVE_COUNT} 件のメッセージを取得
  const last10Messages = await messageGatewayPort.getMessagesRecursive({
    fromMessageId: currentMsgId,
    recursiveCount: MAX_RECURSIVE_COUNT,
  });

  // 直近のAIの発言者のIDを取得する
  let currentAiUserId: number | undefined; // AIの発言を要約するためのID(undefinedの場合は適当なAIのメッセージの発言者のIDを後続の処理で指定する)
  // メッセージを遡って言ってAIがいればそのIDを取得する
  let msg: Message = currentMsg;
  while (!currentAiUserId) {
    // 親メッセージの発言者を取得
    const [msgUser] = await userGatewayPort.getUsers({
      ids: [msg.userId],
    });
    if (!msgUser) {
      break;
    }
    // 親メッセージの発言者がAIの場合はそのIDを取得
    if (msgUser.isAi) {
      currentAiUserId = msgUser.userId;
      break;
    }
    // 現在のメッセージの親メッセージを取得
    if (!msg.parentMessageId) {
      break;
    }
    const parentMsg = await messageGatewayPort.findMessage({
      id: msg.parentMessageId,
    });
    if (!parentMsg) {
      break;
    }
    msg = parentMsg;
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
  logger.info("currentAiMember", currentAiMember);
  if (!currentAiMember) {
    throw new UseCaseError(
      `member not found: ${currentAiUserId}`,
      ErrorCodes.FailedToGenerateNextMessage
    );
  }
  const nextAiMember = aiMembers.find((m) => m.userId !== currentAiUserId);
  logger.info("nextAiMember", nextAiMember);
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
  const SUMMARIZE_TEXT_LIMIT = 5000;
  // 現在のAIのメッセージを要約するために取得
  const currentAiUserMsgs = await messageGatewayPort.getMessagesRecursiveByUser(
    {
      fromMessageId: currentMsg.messageId,
      filteringUserId: currentAiUserId,
      textLimit: SUMMARIZE_TEXT_LIMIT,
    }
  );
  // 最新10件のメッセージに入っているAIの発言は除いて要約する
  const reversedCurrentAiUserMsgs = currentAiUserMsgs.reverse();
  const last10MessagesIds = last10Messages.map((m) => m.messageId);
  const aiMsgsWithoutLast10 = reversedCurrentAiUserMsgs.filter(
    (msg) => !last10MessagesIds.includes(msg.messageId)
  );
  // 最新10件のメッセージよりも過去のメッセージを対象にChatGPTに500文字以内で要約を要求
  const summarizedAiMsg =
    aiMsgsWithoutLast10.length > 0
      ? await messageGeneratorGatewayPort.summarize({
          messages: aiMsgsWithoutLast10,
          // 現在のメッセージの発言者のSystemを指定
          gptSystem: currentAiMember?.gptSystem
            ? currentAiMember?.gptSystem
            : currentAiUser.originalGptSystem,
          apiKey,
          model,
        })
      : "";

  let generatedMessage: GenerateResponse;

  // 現在のメッセージのルームの人間のユーザーを取得
  const humanUsers = (
    await userGatewayPort.getUsers({ ids: currentChatRoomUserIds })
  ).filter((u) => !u.isAi);
  const humanUser = humanUsers[0];
  // 直近の3件のメッセージのなかに人の発言があるか？
  const hasHumanMsg = !!last10Messages.slice(0, 3).find((msg) => {
    if (humanUsers.map((h) => h.userId).includes(msg.userId)) {
      return true;
    }
    return false;
  });

  // 最新の10件のメッセージの発言者を取得
  const latestUsers = await userGatewayPort.getUsers({
    ids: last10Messages.map((msg) => msg.userId),
  });

  const props: GenerateProps = {
    apiKey,
    model,
    info: {
      messages: [
        // 要約を先頭に持ってくる
        { content: summarizedAiMsg, userName: currentAiUser.name },
        ...last10Messages.reverse().map((msg) => ({
          content: msg.content,
          userName:
            latestUsers.find((user) => user.userId === msg.userId)?.name || "",
        })),
      ],
      targetUserName: currentAiUser.name,
      selfUserName: nextAiUser.name,
      humanName: humanUser.name,
      gptSystem: nextAiMember?.gptSystem
        ? nextAiMember?.gptSystem
        : nextAiUser.originalGptSystem,
    },
  };

  if (hasHumanMsg) {
    // 3件のメッセージの中に人の発言を含む場合
    generatedMessage = await messageGeneratorGatewayPort.generateWithHuman(
      props
    );
  } else {
    // 人の発言を含まない場合
    generatedMessage = await messageGeneratorGatewayPort.generate(props);
  }
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
