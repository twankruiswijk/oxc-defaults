interface User {
  id: string;
}

export function byId(users: User[]): Map<string, User> {
  const lookup = new Map<string, User>();
  for (const user of users) {
    lookup.set(user.id, user);
  }
  return lookup;
}
