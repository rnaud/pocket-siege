// 0049E220 accumulates elapsed time in 0x14 ms steps; 00491960 waits 0x14 ms.
// 004A1A00 increments the logic frame after dispatching FrameFinish.
export const LOGIC_STEP_MS = 20;
export const LOGIC_STEP_SECONDS = LOGIC_STEP_MS / 1000;
