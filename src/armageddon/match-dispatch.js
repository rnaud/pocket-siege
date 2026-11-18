import { nativeBodyTickMemory } from "./body-tick-memory.js";
import { nativeForwardTaskEventMemory } from "./task-memory.js";
import { nativeCollectMatchInput } from "./match-input.js";

//004CA750: the index sent to004CA320 is the one-based sparse slot index,
//not the number of live actors. Callbacks may replace the backing list/count.
export function nativeAdvancePhysicsListMemory(
  memory,
  environment,
  advanceBody,
) {
  let index = 0;
  while (index < (memory.get(environment + 0x24) | 0)) {
    const body = memory.get(memory.get(environment + 0x28) + index++ * 4);
    if (body) advanceBody(environment, body, index);
  }
}
//004B4CE0 ->004ECFB0 event3E9. Resolve the scene/environment after children
//return, because their events may replace ownership pointers.
export function nativeBeginMatchFrame(
  memory,
  root,
  sender,
  size,
  payload,
  host,
) {
  memory.put(root + 0x3c, 1);
  nativeForwardTaskEventMemory(
    memory,
    root,
    sender,
    0x3e9,
    size,
    payload,
    host.dispatchTask,
  );
  const environment = memory.get(memory.get(root + 0x38) + 0x7d4);
  nativeAdvancePhysicsListMemory(
    memory,
    environment,
    host.advanceBody ??
      ((environment, body, index) =>
        nativeBodyTickMemory(memory, environment, body, index, host.physics)),
  );
}
//Recovered root routes; unported event semantics must be supplied explicitly.
export function nativeDispatchMatchEventMemory(
  memory,
  root,
  sender,
  event,
  size,
  payload,
  host,
) {
  if (event === 0x3e9)
    return nativeBeginMatchFrame(memory, root, sender, size, payload, host);
  if (event === 0x3ec)
    return nativeCollectMatchInput(memory, root, sender, size, payload, host);
  if (host.dispatchMatchEvent)
    return host.dispatchMatchEvent(root, sender, event, size, payload);
  throw new RangeError(
    `Native match event not connected: ${event.toString(16)}`,
  );
}
