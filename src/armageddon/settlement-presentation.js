// 004B64B0 presentation gates,004B6FB5..004B70DE. Enter after the
// controller's movement, retreat and team-state gates. Query inputs are
// snapshots of004EC190/290,004EBFE0,004ECA20 and004EC2D0 respectively.
export function nativeSettlementPresentation(input) {
  const { health, sort, death, announcements, removal, ...body } = input;
  const calls = [];
  const result = ready => ({ body, calls, ready });
  const panel = () => {
    calls.push('showPanel');
    body.panelTarget = 65536;
    return body.panelProgress === 65536;
  };
  const refresh = () => {
    calls.push('refreshHealth', 'refreshTeams');
    body.refreshHealth = body.refreshTeams = 0;
  };
  calls.push('health');
  if (health) {
    if (panel()) { calls.push('revealHealth'); refresh(); }
    return result(false);
  }
  calls.push('sort');
  if (sort) {
    if (panel()) calls.push('sortTeams');
    return result(false);
  }
  calls.push('death');
  if (death) {
    // Shared context offsets1AC8,814,818,1D43C; preserve the active-team gate.
    body.activity = 0;
    if (!body.activeTeam) { body.mode = 1; body.rate = 100; }
    body.turnFlag = 0;
    refresh();
    panel(); // Death dispatch does not wait for the panel to finish opening.
    calls.push('startDeath');
    return result(false);
  }
  calls.push('announcements');
  if (announcements) return result(false);
  calls.push('removal');
  if (removal) {
    if (panel()) calls.push('removeTeam');
    return result(false);
  }
  return result(true);
}
