import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gray, onColor, radius, spacing, status, type as typo } from '@/theme';
import { FranchiseMark } from '@/components/FranchiseMark';
import { SegmentControl } from '@/components/SegmentControl';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import {
  PlayerRow,
  cellStyle,
  ACTION_COL_WIDTH,
  type ColumnDef,
} from '@/components/PlayerRow';
import {
  capTracked,
  computeDropImpact,
  computeRecord,
  contractsTracked,
  formatRecord,
  getFranchiseIdentity,
  getRosterByFranchise,
  league,
  tierLabel,
  type RosterBucket,
  type RosterRow,
} from '@/data';

// RosterView — the roster surface (Navigation "Roster Management",
// /:leagueSlug/my-team/roster and the read-only /:leagueSlug/franchise/:slug/
// roster). Operational mood (Wireframes §2): a slim context bar — NOT the
// editorial masthead, which belongs to the Franchise Overview — over a bucket
// segment control and a roster table. Composes the built design-system
// components (placeholder UI; visual refinement comes later). Spec:
// specs/roster/screens/Screen_RosterView.md, parent
// specs/franchise/Spec_FranchiseScreens.md.
//
// Table layout follows the config-driven column pattern (hardened on Standings,
// commit 07aaa78): the header cells AND the PlayerRow body cells lay out from
// ONE tier-aware ROSTER_COLUMNS array through the SAME cellStyle(col), inside
// containers with the same md padding + COLUMN_GAP, so they can't drift. The
// trailing action cell is reserved in BOTH states — the owner view renders the
// "⋯" trigger in it, the visitor view renders an empty spacer of the same width
// — so the data columns stay put and toggling isOwner moves nothing but the
// affordance appearing/disappearing in its reserved slot.
//
// Owner vs. visitor — hide, don't disable (Spec "Interaction patterns"): on
// /my-team (isOwner) the context-bar "Set Lineup", the per-row ActionMenu, and
// the "Add Player" entry render; on /franchise/:slug they are HIDDEN — not
// greyed — and the single visitor affordance "Propose Trade" appears in the
// context bar instead. Tier-gated columns and bucket tabs are omitted entirely.
//
// Actions are affordances, not mutations: there is no persistence yet, so every
// action is wired to an optional callback that is stubbed (undefined / no-op)
// until the backend exists. The drop-penalty NUMBER, by contrast, is a real
// computed read off the fixture (computeDropImpact).

type RosterViewProps = {
  franchiseId: string;
  /** /my-team → true (own team, action affordances shown); /franchise/:slug →
   *  false (read-only visitor view, owner actions hidden). Defaults to true. */
  isOwner?: boolean;
  // Owner actions (hidden for visitors). Stubbed until the backend exists.
  onSetLineup?: () => void;
  onAddPlayer?: () => void;
  onDropPlayer?: (playerId: string) => void;
  onMovePlayerToIR?: (playerId: string) => void;
  onMovePlayerToTaxi?: (playerId: string) => void;
  onActivatePlayer?: (playerId: string) => void;
  // Propose Trade — the visitor context-bar affordance (franchise-level) and
  // the per-row menu item (optionally seeded with the player). One handler.
  onProposeTrade?: (playerId?: string) => void;
};

// Right-edge gutter so the trailing action column isn't flush to the screen
// edge. Carried as paddingRight INSIDE the reserved action cell (not on the row
// container) so the header fill still bleeds to the edge while the trigger sits
// off it, and so the reserved footprint is identical in owner and visitor views.
// PLACEHOLDER spacing — Figma will supersede.
const TABLE_RIGHT_GUTTER = 20;

// Inter-column gap for the roster table — tightened from spacing.sm so the
// numeric block (Sal/Yrs/Wk/Total) reads as a cluster. Applied to BOTH the
// header (headerData) and the PlayerRow body (its `gap` prop) so the two stay
// aligned. PLACEHOLDER spacing — Figma will supersede.
const COLUMN_GAP = 6;

// Segment → rosterBucket mapping (Spec "Bucket filter"), with the tier gate
// each tab requires: Active always; IR only if the league has IR spots; Taxi
// only if it has taxi spots (Wireframes §2.4 — hidden, not greyed).
const SEGMENTS: ReadonlyArray<{
  label: string;
  bucket: RosterBucket;
  enabled: () => boolean;
}> = [
  { label: 'Active', bucket: 'ACTIVE', enabled: () => true },
  { label: 'IR', bucket: 'INJURED_RESERVE', enabled: () => league.irSpots > 0 },
  { label: 'Taxi', bucket: 'TAXI_SQUAD', enabled: () => league.taxiSquadSpots > 0 },
];

// ─── COLUMN CONFIG — single source of truth for the roster table layout ──────
// Tier-aware: the salary column shows where the league tracks salaries
// (capTracked: Dynasty always, Keeper if trackSalaries, Redraft never) and the
// contract-years column where it tracks contracts (contractsTracked) —
// Spec_FranchiseScreens "Tier variations". Tier-gated columns are OMITTED, not
// rendered greyed. Headshot is dropped on this phone roster to give the flexing
// name column room (Wireframes §2.2 mobile adaptation). Widths are tuned for
// the 390px phone frame; the name column flexes to absorb the remainder.
//
// Returned to both the header and the PlayerRow body so a single array drives
// both. Tune column geometry here; nothing downstream changes.
function rosterColumns(): ColumnDef[] {
  const cols: ColumnDef[] = [
    { key: 'position', label: 'POS', width: 34 },
    { key: 'nameTeam', label: 'Player' }, // flex — absorbs leftover width
    // Fixed slot sized to the 16px InjuryIndicator so the badge holds position
    // immediately after the (truncating) name and never wraps under it.
    { key: 'injury', label: '', width: 16 },
  ];
  // Numeric columns — trimmed close to their content so the right-aligned
  // values cluster (with COLUMN_GAP) instead of spreading. PLACEHOLDER widths.
  if (capTracked()) {
    cols.push({ key: 'salary', label: 'Sal', width: 46, align: 'right' });
  }
  if (contractsTracked()) {
    cols.push({ key: 'contractYears', label: 'Yrs', width: 28, align: 'right' });
  }
  cols.push({ key: 'weekScore', label: 'Wk', width: 38, align: 'right' });
  cols.push({ key: 'seasonTotal', label: 'Total', width: 46, align: 'right' });
  return cols;
}

export function RosterView({
  franchiseId,
  isOwner = true,
  onSetLineup,
  onAddPlayer,
  onDropPlayer,
  onMovePlayerToIR,
  onMovePlayerToTaxi,
  onActivatePlayer,
  onProposeTrade,
}: RosterViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Which row's action menu is open (owner only). One at a time.
  const [openMenuPlayerId, setOpenMenuPlayerId] = useState<string | null>(null);

  const franchise = getFranchiseIdentity(franchiseId);

  if (!franchise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>Franchise not found.</Text>
      </View>
    );
  }

  const roster = getRosterByFranchise(franchiseId);
  const columns = rosterColumns();
  const showCap = capTracked();

  // Only the tier-enabled buckets get a tab. Counts render for every visible
  // segment, including empty buckets (shows "0").
  const visibleSegments = SEGMENTS.filter((s) => s.enabled());
  const segmentLabels = visibleSegments.map(
    ({ label, bucket }) =>
      `${label} ${roster.filter((r) => r.bucket === bucket).length}`,
  );
  const selected = visibleSegments[Math.min(activeIndex, visibleSegments.length - 1)];
  const bucketRows = roster.filter((r) => r.bucket === selected.bucket);

  const selectBucket = (i: number) => {
    setActiveIndex(i);
    setOpenMenuPlayerId(null); // close any open menu when changing buckets
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Context bar — operational, minimal: franchise marker + name + tier
            label + record. No masthead (that's the Overview). Owner gets the
            "Set Lineup" entry; the visitor gets "Propose Trade". */}
        <View style={styles.contextBar}>
          <FranchiseMark franchise={franchise} size={36} />
          <View style={styles.contextText}>
            <Text style={styles.contextName} numberOfLines={1}>
              {franchise.name}
            </Text>
            <View style={styles.contextMetaRow}>
              <Text style={styles.contextTier} numberOfLines={1}>
                {tierLabel()}
              </Text>
              <Text style={styles.contextRecord}>
                {formatRecord(computeRecord(franchiseId))}
              </Text>
            </View>
          </View>
          {isOwner ? (
            <ActionButton label="Set Lineup" onPress={onSetLineup} />
          ) : (
            <LinkAction label="Propose Trade" onPress={() => onProposeTrade?.()} />
          )}
        </View>

        <View style={styles.controls}>
          <SegmentControl
            segments={segmentLabels}
            activeIndex={Math.min(activeIndex, visibleSegments.length - 1)}
            onChangeIndex={selectBucket}
          />
        </View>

        {bucketRows.length > 0 ? (
          <View>
            {/* Header — rendered from `columns` through the same cellStyle as
                the rows, inside the same md padding + sm gap. Reserves a
                trailing action cell when owner actions show, matching each
                row, so the data columns line up. DataTable's own header is
                off. */}
            <View style={styles.tableRow}>
              <View style={[styles.dataRegion, styles.headerData]}>
                {columns.map((col) => (
                  <View key={col.key} style={cellStyle(col)}>
                    <Text style={styles.headerText} numberOfLines={1}>
                      {col.label}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Reserved trailing action cell — always rendered (empty in the
                  visitor view) so the data columns don't shift when isOwner
                  toggles. */}
              <View style={[styles.actionCell, styles.headerData]} />
            </View>

            <DataTable<RosterRow>
              columns={columns as DataTableColumn<RosterRow>[]}
              data={bucketRows}
              density="compact"
              showHeader={false}
              showDensityToggle={false}
              renderRow={(row) => {
                const open = openMenuPlayerId === row.player.id;
                return (
                  <View>
                    <View style={styles.tableRow}>
                      <View style={styles.dataRegion}>
                        <PlayerRow
                          row={row}
                          density="compact"
                          columns={columns}
                          gap={COLUMN_GAP}
                        />
                      </View>
                      {/* Reserved trailing action cell — always present (empty
                          for visitors) so toggling isOwner moves nothing but
                          the trigger inside it. */}
                      <View style={styles.actionCell}>
                        {isOwner ? (
                          <RowActionTrigger
                            active={open}
                            onPress={() =>
                              setOpenMenuPlayerId(open ? null : row.player.id)
                            }
                          />
                        ) : null}
                      </View>
                    </View>

                    {isOwner && open ? (
                      <RowActionMenu
                        row={row}
                        showPenalty={showCap}
                        onClose={() => setOpenMenuPlayerId(null)}
                        onDrop={onDropPlayer}
                        onMoveToIR={onMovePlayerToIR}
                        onMoveToTaxi={onMovePlayerToTaxi}
                        onActivate={onActivatePlayer}
                        onProposeTrade={onProposeTrade}
                      />
                    ) : null}
                  </View>
                );
              }}
            />

            {/* Inline Add Player entry → Add/Drop screen (owner only). */}
            {isOwner ? (
              <View style={styles.addPlayerWrap}>
                <LinkAction label="+ Add Player" onPress={onAddPlayer} />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No players on {selected.label}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── per-row action affordances ──────────────────────────────────────────────
// Menu items reflect VALID bucket transitions only (Roster Management §"Bucket
// transitions"): a player can never move directly between IR and taxi — they
// route through ACTIVE — so an active player offers "Move to IR" / "Move to
// Taxi", while an IR or taxi player offers "Activate". Drop and Propose Trade
// apply from any bucket. (Finer gates — injury-status IR eligibility, move
// cooldowns — are deferred until those League config fields are in the fixture.)

type RowActionMenuProps = {
  row: RosterRow;
  showPenalty: boolean;
  onClose: () => void;
  onDrop?: (playerId: string) => void;
  onMoveToIR?: (playerId: string) => void;
  onMoveToTaxi?: (playerId: string) => void;
  onActivate?: (playerId: string) => void;
  onProposeTrade?: (playerId?: string) => void;
};

function RowActionMenu({
  row,
  showPenalty,
  onClose,
  onDrop,
  onMoveToIR,
  onMoveToTaxi,
  onActivate,
  onProposeTrade,
}: RowActionMenuProps) {
  const playerId = row.player.id;
  const fire = (cb?: (id: string) => void) => () => {
    cb?.(playerId);
    onClose();
  };

  // Bucket-aware transition items.
  const transitions: { label: string; onPress: () => void }[] = [];
  if (row.bucket === 'ACTIVE') {
    transitions.push({ label: 'Move to IR', onPress: fire(onMoveToIR) });
    transitions.push({ label: 'Move to Taxi', onPress: fire(onMoveToTaxi) });
  } else {
    // From IR or Taxi the only valid bucket move is back to ACTIVE.
    transitions.push({ label: 'Activate', onPress: fire(onActivate) });
  }

  return (
    <View style={styles.menu}>
      {transitions.map((item) => (
        <MenuItem key={item.label} label={item.label} onPress={item.onPress} />
      ))}
      <MenuItem
        label="Propose Trade"
        onPress={() => {
          onProposeTrade?.(playerId);
          onClose();
        }}
      />
      {/* Drop is the destructive item; in cap tiers it carries the computed
          drop-penalty preview before the (stubbed) drop fires. */}
      <MenuItem label="Drop" tone="danger" onPress={fire(onDrop)} />
      {showPenalty ? <DropPenaltyPreview row={row} /> : null}
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      {({ pressed }) => (
        <Text
          style={[
            styles.menuItemText,
            tone === 'danger' && styles.menuItemDanger,
            pressed && styles.menuItemPressed,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// The real computed cap consequence of a drop (computeDropImpact off the
// fixture) — the penalty charged, the salary relief freed, and the net cap
// impact. The number is real even though the drop action itself is stubbed.
function DropPenaltyPreview({ row }: { row: RosterRow }) {
  const { salaryRelief, penalty, netImpact } = computeDropImpact(row.contract);
  return (
    <View style={styles.penalty}>
      <Text style={styles.penaltyHead}>
        Drop penalty {money(penalty)}
      </Text>
      <Text style={styles.penaltyDetail}>
        Frees {money(salaryRelief)} · net{' '}
        {netImpact >= 0 ? `+${money(netImpact)}` : `−${money(Math.abs(netImpact))}`}{' '}
        cap
      </Text>
    </View>
  );
}

// "⋯" trigger that opens/closes a row's action menu.
function RowActionTrigger({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={spacing.sm} style={styles.trigger}>
      <Text style={[styles.triggerGlyph, active && styles.triggerGlyphActive]}>
        ⋯
      </Text>
    </Pressable>
  );
}

// ─── shared action affordances (placeholder UI) ──────────────────────────────
// No Button component is specced yet, so these mirror FranchiseHome's minimal
// token-built placeholders; they get replaced when the design system's Button /
// LinkAction land. Pressing a stubbed (undefined) handler is a no-op.

function LinkAction({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={spacing.sm}>
      {({ pressed }) => (
        <Text style={[styles.link, pressed && styles.linkPressed]}>{label}</Text>
      )}
    </Pressable>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      {({ pressed }) => (
        <Text style={[styles.buttonText, pressed && styles.buttonTextPressed]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const money = (n: number) => `$${n.toFixed(2)}`;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: gray[0],
  },
  scrollContent: {
    // Context bar and table sit full-bleed; only the inter-region rhythm is
    // managed here.
    paddingBottom: spacing.lg,
  },

  // context bar — slim, grayscale; the FranchiseMark is the only color.
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
  },
  contextText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  // Franchise name: Barlow Condensed semibold, operational (not the masthead's
  // 32px display). headlineSm is the closest committed token.
  contextName: {
    ...typo.headlineSm,
    color: gray[900],
  },
  contextMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contextTier: {
    ...typo.mono,
    color: gray[500],
    flexShrink: 1,
  },
  contextRecord: {
    ...typo.dataSm,
    color: gray[700],
  },

  // The segment control is inset to the page gutter; the table below keeps
  // PlayerRow's own spacing.md gutter, so the two left edges read as aligned.
  controls: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  // table row scaffold — a flex:1 data region plus an optional fixed-width
  // trailing action cell. The header and every body row share this scaffold so
  // their data regions resolve to the same width and the columns can't drift.
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dataRegion: {
    flex: 1,
    minWidth: 0,
  },
  // Header's data region adds the md padding + COLUMN_GAP that PlayerRow brings
  // on its own for body rows, plus the header height / fill / rule.
  headerData: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: spacing.md,
    gap: COLUMN_GAP,
    backgroundColor: gray[25],
    borderBottomWidth: 1,
    borderBottomColor: gray[200],
  },
  headerText: {
    ...typo.label,
    color: gray[500],
  },
  // Reserved trailing action cell. Total footprint = the affordance width + the
  // right-edge gutter (carried as paddingRight so the header fill still bleeds
  // to the screen edge). Identical in owner and visitor views, so the data
  // columns can't shift when isOwner toggles.
  actionCell: {
    width: ACTION_COL_WIDTH + TABLE_RIGHT_GUTTER,
    paddingRight: TABLE_RIGHT_GUTTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trigger: {
    paddingHorizontal: spacing.xs,
  },
  triggerGlyph: {
    ...typo.dataMd,
    color: gray[500],
  },
  triggerGlyphActive: {
    color: gray[900],
  },

  // per-row action menu — inline block beneath the opened row.
  menu: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: gray[25],
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
    gap: spacing.xs,
  },
  menuItem: {
    paddingVertical: spacing.sm,
  },
  menuItemText: {
    ...typo.label,
    color: gray[700],
  },
  menuItemDanger: {
    color: status.error,
  },
  menuItemPressed: {
    opacity: 0.6,
  },
  // drop-penalty preview — the real computed number.
  penalty: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: gray[50],
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  penaltyHead: {
    ...typo.dataSm,
    color: gray[900],
  },
  penaltyDetail: {
    ...typo.bodyXs,
    color: gray[500],
  },

  addPlayerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'flex-start',
  },

  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    ...typo.bodySm,
    color: gray[500],
  },

  // text link affordance — "Propose Trade" / "+ Add Player". Barlow label scale
  // in gray-600; dims on press.
  link: {
    ...typo.bodyXs,
    color: gray[600],
  },
  linkPressed: {
    color: gray[400],
  },
  // primary action placeholder — dark fill, onColor text.
  button: {
    alignSelf: 'flex-start',
    backgroundColor: gray[900],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonText: {
    ...typo.label,
    color: onColor(gray[900]),
  },
  buttonTextPressed: {
    opacity: 0.7,
  },
});
