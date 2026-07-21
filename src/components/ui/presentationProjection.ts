/** Selects an explicit subset without allowing replacement or reordered records. */
export type PresentationSubsetSelector<T> = (item: Readonly<T>, index: number) => boolean;

export interface PresentationProjectionKeys<
  T extends object,
  IdentityKey extends keyof T,
  LabelKey extends keyof T,
  ValueKey extends keyof T,
> {
  identity: IdentityKey;
  label: LabelKey;
  values: readonly ValueKey[];
}

export interface PresentationProjection<
  T extends object,
  IdentityKey extends keyof T,
  LabelKey extends keyof T,
  ValueKey extends keyof T,
> {
  readonly source: T;
  readonly identity: T[IdentityKey];
  readonly label: T[LabelKey];
  readonly values: Readonly<Pick<T, ValueKey>>;
}

export function selectPresentationSubset<T extends object>(
  items: readonly T[],
  selector?: PresentationSubsetSelector<T>,
): readonly T[] {
  return selector ? items.filter((item, index) => selector(item, index)) : items;
}

function projectPresentationItems<T extends object, I extends keyof T, L extends keyof T, V extends keyof T>(
  items: readonly T[],
  keys: PresentationProjectionKeys<T, I, L, V>,
  selector?: PresentationSubsetSelector<T>,
): readonly PresentationProjection<T, I, L, V>[] {
  return selectPresentationSubset(items, selector).map((source) => {
    const values = Object.fromEntries(keys.values.map((key) => [key, source[key]])) as Pick<T, V>;
    return Object.freeze({ source, identity: source[keys.identity], label: source[keys.label], values: Object.freeze(values) });
  });
}

export const projectRecords = projectPresentationItems;
export const projectKpis = projectPresentationItems;
export const projectChartSeries = projectPresentationItems;
