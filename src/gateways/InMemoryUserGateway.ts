import { User } from "../entities/User";
import {
  CreateUserProps,
  GetUserProps,
  UserGatewayPort,
} from "../ports/UserGatewayPort";

const users: User[] = [];

export class InMemoryUserGateway implements UserGatewayPort {
  getUsers(p: GetUserProps): Promise<User[]> {
    return Promise.resolve(users.filter((user) => p.ids.includes(user.id)));
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
