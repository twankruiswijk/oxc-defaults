interface User {
  id: string;
}

export function byId(users: User[]): Map<string, User> {
  return users.reduce((lookup, user) => lookup.set(user.id, user), new Map<string, User>());
}
