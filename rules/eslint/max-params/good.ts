interface NewUser {
  name: string;
  email: string;
  role: string;
  team: string;
  active: boolean;
}

export function createUser(user: NewUser): void {
  save(user);
}
