export type StableDomainKey = string | number;

export interface IdentityReconciliationOptions {
  /** Retain temporarily absent items so filtering/pagination cannot reset their state. */
  retainAbsent?: boolean;
}

/**
 * Reconciles owner-held item state by stable domain identity. Presentation order
 * never determines association; callers explicitly prune state after a domain
 * deletion by passing `retainAbsent: false` with the complete remaining set.
 */
export function reconcileStateByIdentity<
  Item,
  Id extends StableDomainKey,
  State,
>(
  items: readonly Item[],
  getId: (item: Item) => Id,
  previousState: ReadonlyMap<Id, State>,
  initializeState: (item: Item) => State,
  options: IdentityReconciliationOptions = {},
): ReadonlyMap<Id, State> {
  const retainAbsent = options.retainAbsent ?? true;
  const nextState = retainAbsent
    ? new Map(previousState)
    : new Map<Id, State>();
  const visibleIds = new Set<Id>();

  items.forEach((item) => {
    const id = getId(item);
    if (visibleIds.has(id)) {
      throw new Error(`Stable collection identities must be unique. Duplicate key: ${String(id)}`);
    }
    visibleIds.add(id);

    if (!nextState.has(id)) {
      nextState.set(
        id,
        previousState.has(id)
          ? previousState.get(id) as State
          : initializeState(item),
      );
    }
  });

  return nextState;
}
