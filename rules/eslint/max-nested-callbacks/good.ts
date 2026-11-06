export const user = await loadUser(id);
export const team = await loadTeam(user);
export const projects = await loadProjects(team);
