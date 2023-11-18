import { InMemoryChatRoomGateway } from "./InMemoryChatRoomGateway";
import { InMemoryMessageGateway } from "./InMemoryMessageGateway";
import { InMemoryUserGateway } from "./InMemoryUserGateway";

const gateWays = {
  chatRoom: new InMemoryChatRoomGateway(),
  message: new InMemoryMessageGateway(),
  messageGenerator: null,
  messageScheduler: null,
  user: new InMemoryUserGateway(),
};

export default gateWays;
