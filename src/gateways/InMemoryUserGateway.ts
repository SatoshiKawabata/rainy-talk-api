import { User } from "../entities/User";
import {
  CreateUserProps,
  GetUserProps,
  UserGatewayPort,
} from "../ports/UserGatewayPort";

const users: User[] = [];

export class InMemoryUserGateway implements UserGatewayPort {
  async getUsers(p: GetUserProps): Promise<User[]> {
    const userList = users.filter((user) => p.ids.includes(user.userId));
    if (p.isAiOnly) {
      return userList.filter((user) => user.isAi);
    }
    return userList;
  }

  async createUser(p: CreateUserProps): Promise<User> {
    const newUser: User = {
      name: p.name,
      originalGptSystem: p.originalGptSystem,
      userId: users.length,
      isAi: p.isAI,
      password: "temp",
    };
    users.push(newUser);
    return newUser;
  }
}
