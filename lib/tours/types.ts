export interface TourStep {
  /** CSS selector for the element to highlight. If not found in the DOM
   * when the tour reaches this step, the step is skipped automatically —
   * steps often target role-gated buttons that don't exist for every viewer. */
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface TourConfig {
  id: string;
  steps: TourStep[];
}
