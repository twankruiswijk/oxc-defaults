export function createUser(name: string, email: string, role: string, team: string, active: boolean): void {
  save({ name, email, role, team, active });
}
