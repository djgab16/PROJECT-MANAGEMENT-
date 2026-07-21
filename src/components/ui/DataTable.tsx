import {
  useId,
  type KeyboardEvent,
  type Key,
  type MouseEvent,
  type ReactNode,
} from 'react';
import './DataTable.css';

export interface ColumnDef<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerLabel?: string;
  className?: string;
}

export interface LegacyDataTableColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

export interface DataTableEmptyState {
  title: string;
  description?: string;
}

type RowActivationProps<T> =
  | Readonly<{
      onRowActivate?: never;
      getRowActivationLabel?: never;
    }>
  | Readonly<{
      onRowActivate: (row: T) => void;
      getRowActivationLabel: (row: T) => string;
    }>;

export type TypedDataTableProps<T> = Readonly<{
  rows: readonly T[];
  columns: readonly ColumnDef<T>[];
  getRowKey: (row: T) => Key;
  caption: string;
  captionVisible?: boolean;
  empty: DataTableEmptyState;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  tableClassName?: string;
}> & RowActivationProps<T>;

/** Compatibility contract retained until the DesignSystem caller migrates. */
export interface LegacyDataTableProps<T> {
  columns: readonly LegacyDataTableColumn<T>[];
  data: readonly T[];
  getRowKey?: (row: T) => Key;
  caption?: string;
  captionVisible?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  rows?: never;
}

export type DataTableProps<T> = TypedDataTableProps<T> | LegacyDataTableProps<T>;

interface NormalizedColumn<T> {
  id: string;
  header: ReactNode;
  headerLabel?: string;
  className?: string;
  cell: (row: T) => ReactNode;
}

const NESTED_INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [role="button"], [role="link"]';

function legacyRowKey<T>(row: T): Key {
  const id = (row as { id?: Key }).id;
  if (id == null) {
    throw new Error('Legacy DataTable rows require an id or an explicit getRowKey callback.');
  }
  return id;
}

interface NormalizedDataTable<T> {
  rows: readonly T[];
  columns: readonly NormalizedColumn<T>[];
  getRowKey: (row: T) => Key;
  caption: string;
  empty: DataTableEmptyState;
  busy: boolean;
  busyLabel: string;
  onRowActivate?: (row: T) => void;
  getRowActivationLabel?: (row: T) => string;
  keyboardActivation: boolean;
}

function normalizeDataTableProps<T>(props: DataTableProps<T>): NormalizedDataTable<T> {
  if ('data' in props) {
    return {
      rows: props.data,
      columns: props.columns.map((column) => {
        const accessor = column.accessor;
        return {
          id: `legacy-${column.header}`,
          header: column.header,
          className: column.className,
          cell: typeof accessor === 'function'
            ? accessor
            : (row: T) => row[accessor] as ReactNode,
        };
      }),
      getRowKey: props.getRowKey ?? legacyRowKey,
      caption: props.caption ?? 'Data table',
      empty: { title: props.emptyMessage ?? 'No records found' },
      busy: false,
      busyLabel: 'Loading records',
      onRowActivate: props.onRowClick,
      keyboardActivation: false,
    };
  }

  return {
    rows: props.rows,
    columns: props.columns,
    getRowKey: props.getRowKey,
    caption: props.caption,
    empty: props.empty,
    busy: Boolean(props.busy),
    busyLabel: props.busyLabel ?? 'Loading records',
    onRowActivate: props.onRowActivate,
    getRowActivationLabel: props.getRowActivationLabel,
    keyboardActivation: Boolean(props.onRowActivate),
  };
}

export default function DataTable<T>(props: DataTableProps<T>) {
  const captionId = `ui-data-table-caption-${useId()}`;
  const {
    rows,
    columns,
    getRowKey,
    caption,
    empty,
    busy,
    busyLabel,
    onRowActivate,
    getRowActivationLabel,
    keyboardActivation,
  } = normalizeDataTableProps(props);

  const activateFromPointer = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowActivate) return;
    if (keyboardActivation && (event.target as Element).closest(NESTED_INTERACTIVE_SELECTOR)) return;
    onRowActivate(row);
  };

  const activateFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!keyboardActivation || !onRowActivate || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onRowActivate(row);
  };

  return (
    <div
      className={`ui-data-table__region ui-scroll-region ui-scroll-region--dense table-responsive ${props.className ?? ''}`.trim()}
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
    >
      <table
        className={`ui-data-table data-table ${props.tableClassName ?? ''}`.trim()}
        aria-busy={busy || undefined}
      >
        <caption
          id={captionId}
          className={props.captionVisible ? 'ui-data-table__caption' : 'ui-data-table__caption ui-data-table__caption--hidden'}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={column.className}
                scope="col"
                aria-label={column.headerLabel}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row) => {
            const activationLabel = getRowActivationLabel?.(row);
            return (
              <tr
                key={getRowKey(row)}
                onClick={onRowActivate ? (event) => activateFromPointer(event, row) : undefined}
                onKeyDown={keyboardActivation ? (event) => activateFromKeyboard(event, row) : undefined}
                className={onRowActivate ? 'clickable-row' : undefined}
                tabIndex={keyboardActivation ? 0 : undefined}
                aria-label={activationLabel}
              >
                {columns.map((column) => (
                  <td key={column.id} className={column.className}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="ui-data-table__state empty-cell">
                <strong role={busy ? 'status' : undefined}>{busy ? busyLabel : empty.title}</strong>
                {!busy && empty.description && <span>{empty.description}</span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
