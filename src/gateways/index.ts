import { InMemoryChatRoomGateway } from "./InMemoryChatRoomGateway";
import { InMemoryMessageGateway } from "./InMemoryMessageGateway";
import { InMemoryMessageGeneratorGateway } from "./InMemoryMessageGeneratorGateway";
import { InMemorySchedulerGateway } from "./InMemoryMessageSchedulerGateway";
import { InMemoryUserGateway } from "./InMemoryUserGateway";

const gateWays = {
  chatRoom: new InMemoryChatRoomGateway(),
  message: new InMemoryMessageGateway(),
  messageGenerator: new InMemoryMessageGeneratorGateway(),
  messageScheduler: new InMemorySchedulerGateway(),
  user: new InMemoryUserGateway(),
};

export default gateWays;
