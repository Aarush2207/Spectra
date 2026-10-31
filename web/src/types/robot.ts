export type RobotState = 'idle' | 'listening' | 'thinking' | 'analysing' | 'alert';

export interface RobotAnimationState {
  state: RobotState;
  lookTarget: { x: number; y: number };
  hoverOffset: number;
  blinkValue: number;
}
