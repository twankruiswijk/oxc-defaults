const user = await loadUser(id);
const team = await loadTeam(user);
const projects = await loadProjects(team);
