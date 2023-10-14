import { User } from "../entities/User";

export type CreateUserProps = {
  name: string;
  originalGptSystem: string;
  isAI: boolean;
};

export type GetUserProps = {
  id: number;
};

export interface UserGatewayPort {
  createUser(p: CreateUserProps): Promise<User>;
  getUser(p: GetUserProps): Promise<User>;
}
