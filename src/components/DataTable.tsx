import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { SegmentControl } from './SegmentControl';

// Generic, data-agnostic table shell. DataTable owns the toolbar (density
// toggle) and the header row; it delegates row rendering to the `renderRow`
// prop so the same table can host PlayerRow, a transaction row, a standings
// row, or anything else. Spec:
// specs/foundation/components/Component_DataTable.md.
//
// Header layout (paddingHorizontal: spacing.md, gap: spacing.sm) matches
// PlayerRow's, so when consumers pass the same column array to both, the
// header cells align with the row cells underneath.

export type Density = 'standard' | 'compact';

export type DataTableColumn<T = unknown> = {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right';
  sortable?: boolean;
  /** Optional cell renderer — DataTable doesn't use it directly (rows go
   *  through renderRow), but it's part of the ColumnDef contract so row
   *  components can consult it. */
  render?: (item: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  density?: Density;
  onDensityChange?: (density: Density) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  showDensityToggle?: boolean;
  showHeader?: boolean;
};

export function DataTable<T>({
  columns,
  data,
  renderRow,
  density = 'standard',
  onDensityChange,
  sortKey,
  sortDirection = 'desc',
  onSort,
  showDensityToggle = true,
  showHeader = true,
}: DataTableProps<T>) {
  const headerHeight = density === 'standard' ? 36 : 28;

  return (
    <View>
      {showDensityToggle && onDensityChange ? (
        <View style={styles.toolbar}>
          <View style={styles.toolbarRight}>
            <SegmentControl
              segments={['Standard', 'Compact']}
              activeIndex={density === 'standard' ? 0 : 1}
              onChangeIndex={(i) =>
                onDensityChange(i === 0 ? 'standard' : 'compact')
              }
            />
          </View>
        </View>
      ) : null}

      {showHeader ? (
        <View style={[styles.headerRow, { height: headerHeight }]}>
          {columns.map((col) => {
            const active = col.key === sortKey;
            const sortable = !!col.sortable && !!onSort;
            const arrow = active
              ? sortDirection === 'asc'
                ? ' ▲'
                : ' ▼'
              : '';

            const cellInner = (
              <View
                style={[
                  cellLayout(col),
                  col.align === 'right' && styles.cellRight,
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    active && styles.headerTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {col.label}
                  {arrow}
                </Text>
              </View>
            );

            return sortable ? (
              <Pressable
                key={col.key}
                onPress={() => onSort?.(col.key)}
                style={pressableCellLayout(col)}
              >
                {cellInner}
              </Pressable>
            ) : (
              <Fragment key={col.key}>{cellInner}</Fragment>
            );
          })}
        </View>
      ) : null}

      {data.map((item, i) => (
        <Fragment key={i}>{renderRow(item, i)}</Fragment>
      ))}
    </View>
  );
}

// ─── layout helpers (mirror PlayerRow's cell sizing) ─────────────────────────
// Take only the geometry fields so the helpers stay non-generic — otherwise
// DataTable's contravariant T (via the optional render prop) would force the
// helpers to be generic too.

type CellGeometry = { width?: number; align?: 'left' | 'right' };

function cellLayout(col: CellGeometry) {
  if (col.width != null) {
    return {
      width: col.width,
      alignItems: col.align === 'right' ? 'flex-end' : 'flex-start',
    } as const;
  }
  return {
    flex: 1,
    // minWidth:0 matches the canonical row cell geometry (the flex/franchise
    // column renders flex:1 + minWidth:0 on the row side), so a long flex-column
    // header label can't refuse to shrink while its rows do — header and rows
    // resolve the flex column to the same width.
    minWidth: 0,
    alignItems: col.align === 'right' ? 'flex-end' : 'flex-start',
  } as const;
}

// Pressable wrapper needs its own width/flex so the touch target matches the
// cell footprint. We let the inner View handle alignItems for the text.
function pressableCellLayout(col: CellGeometry) {
  return col.width != null ? { width: col.width } : { flex: 1 };
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: gray[50],
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
  },
  toolbarRight: {
    marginLeft: 'auto',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: gray[25],
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
  },
  cellRight: {
    alignItems: 'flex-end',
  },
  headerText: {
    ...typo.label,
    color: gray[500],
  },
  // Active sort column gets darker text so the indicator + label read as the
  // pivot of the table.
  headerTextActive: {
    color: gray[700],
  },
});
