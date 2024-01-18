import { User } from "../entities/User";

export type CreateUserProps = {
  name: string;
  originalGptSystem: string;
  isAI: boolean;
};

export type GetUserProps = {
  ids: User["userId"][];
  isAiOnly?: boolean; // AIのみを取得するかどうか
};

export interface UserGatewayPort {
  createUser(p: CreateUserProps): Promise<User>;
  getUsers(p: GetUserProps): Promise<User[]>;
}
