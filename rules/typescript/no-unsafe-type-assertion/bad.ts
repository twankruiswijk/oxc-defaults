interface User {
  name: string;
}

export function toUser(value: unknown): User {
  return value as User;
}
