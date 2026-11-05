interface User {
  id: string;
}

export function userId(user: User): string {
  return user.id;
}
