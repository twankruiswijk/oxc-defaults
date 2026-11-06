interface User {
  email: string;
}

export function ownerEmail(users: Map<string, User>, id: string): string {
  return users.get(id)!.email;
}
