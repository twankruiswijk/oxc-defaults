interface User {
  email: string;
}

export function ownerEmail(users: Map<string, User>, id: string): string {
  const user = users.get(id);
  if (user === undefined) throw new Error(`No user ${id}`);
  return user.email;
}
