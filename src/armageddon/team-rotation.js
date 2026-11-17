const signedByte = value => (value << 24) >> 24;

// 004B36B0: scheme alliance count and signed initial cursor bytes.
export function nativeTeamRotationReset({ groups, initialGroup, cursors, starts }) {
  cursors = [...cursors];
  for (let i = 0; i < (groups & 255); i++) cursors[i] = signedByte(starts[i]) + 1;
  return { group: signedByte(initialGroup), cursors };
}

// 004B38C0(normal) /004B37F0(deployment). Native limits are six
// candidates per alliance and six alliance passes, not roster length.
// Inputs must have valid nonzero team/alliance counts and cursor indices.
export function nativeSelectNextTeam(input) {
  let { group } = input;
  const { teams, deployment } = input;
  const groups = input.groups & 255;
  const cursors = [...input.cursors], calls = [];
  const result = team => ({ group, cursors, team, calls });
  for (let pass = 0; pass < 6; pass++) {
    for (let candidate = 0; candidate < 6; candidate++) {
      const id = cursors[group];
      cursors[group] = id % teams.length + 1;
      const team = teams[id - 1];
      if (signedByte(team.group) !== group) continue;
      calls.push({ operation: 'health', team: id });
      const health = team.eliminated ? 0 : team.worms.reduce((sum, w) => (sum + w.hp) | 0, 0);
      if (health <= 0) continue;
      let eligible;
      if (deployment) {
        calls.push({ operation: 'deployment', team: id });
        eligible = !team.eliminated && team.worms.some(w => w.state === 100);
      } else eligible = !(team.unavailable & 255);
      if (eligible) {
        group = (group + 1) % groups;
        return result(id);
      }
    }
    group = (group + 1) % groups;
  }
  return result(0);
}
