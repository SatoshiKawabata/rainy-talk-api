import { User } from "../entities/User";
import {
  CreateUserProps,
  GetUserProps,
  UserGatewayPort,
} from "../ports/UserGatewayPort";

const users: User[] = [];

export class InMemoryUserGateway implements UserGatewayPort {
  getUser(p: GetUserProps): Promise<User> {
    const user = users.find((user) => user.id === p.id);
    if (!user) {
      throw new Error(`No such user: ${JSON.stringify(p)}`);
    }
    return Promise.resolve(user);
  }

  createUser(p: CreateUserProps): Promise<User> {
    const newUser: User = {
      name: p.name,
      originalGptSystem: p.originalGptSystem,
      id: users.length,
      isAi: p.isAI,
      password: "temp",
    };
    users.push(newUser);
    return Promise.resolve(newUser);
  }
}
