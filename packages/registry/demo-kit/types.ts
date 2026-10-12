/**
 * Demo contract shared by the playground app and the docs site. Not shipped to
 * users: demos are documentation, not part of a component.
 *
 * Each `items/<name>/demo.tsx` exports:
 *   - `controls`: the knobs shown in the control panel
 *   - default: a component that receives the current control values
 */

export type NumberControl = {
  type: 'number';
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type BooleanControl = {
  type: 'boolean';
  label: string;
  default: boolean;
};

export type SelectControl<T extends string = string> = {
  type: 'select';
  label: string;
  options: readonly T[];
  default: T;
};

export type Control = NumberControl | BooleanControl | SelectControl;

export type Controls = Record<string, Control>;

export type ControlValues<C extends Controls> = {
  [K in keyof C]: C[K] extends NumberControl
    ? number
    : C[K] extends BooleanControl
      ? boolean
      : C[K] extends SelectControl<infer T>
        ? T
        : never;
};

export function defaultValues<C extends Controls>(controls: C): ControlValues<C> {
  const out: Record<string, unknown> = {};
  for (const [key, control] of Object.entries(controls)) out[key] = control.default;
  return out as ControlValues<C>;
}

/** Narrowing helper so `controls` keeps literal option types. */
export function defineControls<const C extends Controls>(controls: C): C {
  return controls;
}
