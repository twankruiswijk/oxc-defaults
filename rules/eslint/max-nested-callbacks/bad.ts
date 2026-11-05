loadUser(id, (user) => {
  loadTeam(user, (team) => {
    loadProjects(team, (projects) => {
      // ...and 8 more levels
    });
  });
});
