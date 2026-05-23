import { useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { gray, radius, spacing, type as typo } from '@/theme';
import { Label } from '@/components/Label';
import { Mono } from '@/components/Mono';
import { PositionBadge } from '@/components/PositionBadge';
import { InjuryIndicator } from '@/components/InjuryIndicator';
import { Headshot } from '@/components/Headshot';
import { FranchiseMark } from '@/components/FranchiseMark';
import { LiveDot } from '@/components/LiveDot';
import { StatValue } from '@/components/StatValue';
import { franchises } from '@/data/mockData';
import type { InjuryStatus } from '@/theme';

// Component preview system — see ~/.claude/skills/component-preview/SKILL.md.
// Web-only design tool. Routes inherit fonts loaded by app/_layout.tsx, so
// type tokens render with the real Barlow / Barlow Condensed / JetBrains Mono.

// ─── registry types ──────────────────────────────────────────────────────────

type StepperControl = {
  key: string;
  type: 'stepper';
  min: number;
  max: number;
  step: number;
};
type ToggleControl = { key: string; type: 'toggle' };
type SelectControl = { key: string; type: 'select'; options: string[] };
type PropControl = StepperControl | ToggleControl | SelectControl;

type FrameMode = 'phone' | 'naked';

type ComponentEntry = {
  id: string;
  label: string;
  category: string;
  backgroundColor: string;
  frameMode: FrameMode;
  /** Required for naked mode; ignored for phone mode (uses 390 fixed). */
  componentWidth?: number;
  componentHeight?: number;
  defaultProps: Record<string, unknown>;
  propControls?: PropControl[];
  render: (props: Record<string, unknown>) => ReactNode;
};

// ─── registry ────────────────────────────────────────────────────────────────

// Color options surfaced to the select control. Keys are the labels the user
// sees in the sidebar; values resolve to actual theme hex when passed into
// the component. Keeping the list short keeps the canvas legible against the
// default light canvas background.
const COLOR_OPTIONS: Record<string, string> = {
  'gray-300': gray[300],
  'gray-500': gray[500],
  'gray-700': gray[700],
  'gray-900': gray[900],
};
const COLOR_KEYS = Object.keys(COLOR_OPTIONS);

const REGISTRY: ComponentEntry[] = [
  {
    id: 'label',
    label: 'Label',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 240,
    defaultProps: {
      children: 'Section Header',
      size: 'md',
      color: 'gray-500',
    },
    propControls: [
      { key: 'size', type: 'select', options: ['md', 'sm'] },
      { key: 'color', type: 'select', options: COLOR_KEYS },
    ],
    render: (props) => (
      <Label
        size={props.size as 'md' | 'sm'}
        color={COLOR_OPTIONS[props.color as string]}
      >
        {props.children as string}
      </Label>
    ),
  },
  {
    id: 'mono',
    label: 'Mono',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 240,
    defaultProps: {
      children: 'OAK · M. TORRES',
      color: 'gray-500',
    },
    propControls: [
      { key: 'color', type: 'select', options: COLOR_KEYS },
    ],
    render: (props) => (
      <Mono color={COLOR_OPTIONS[props.color as string]}>
        {props.children as string}
      </Mono>
    ),
  },
  {
    id: 'position-badge',
    label: 'PositionBadge',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 80,
    defaultProps: {
      position: 'QB',
      size: 'sm',
    },
    propControls: [
      {
        key: 'position',
        type: 'select',
        options: ['QB', 'RB', 'WR', 'TE', 'PK', 'LB', 'CB', 'S', 'FLEX'],
      },
      { key: 'size', type: 'select', options: ['sm', 'md', 'lg'] },
    ],
    render: (props) => (
      <PositionBadge
        position={props.position as string}
        size={props.size as 'sm' | 'md' | 'lg'}
      />
    ),
  },
  {
    id: 'injury-indicator',
    label: 'InjuryIndicator',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 40,
    defaultProps: {
      status: 'Q',
    },
    propControls: [
      { key: 'status', type: 'select', options: ['Q', 'D', 'O', 'IR', 'none'] },
    ],
    render: (props) => {
      const raw = props.status as string;
      const status = raw === 'none' ? null : (raw as InjuryStatus);
      return <InjuryIndicator status={status} />;
    },
  },
  {
    id: 'headshot',
    label: 'Headshot',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 120,
    defaultProps: {
      size: 64,
    },
    propControls: [
      { key: 'size', type: 'stepper', min: 24, max: 96, step: 8 },
    ],
    render: (props) => <Headshot size={props.size as number} />,
  },
  {
    id: 'franchise-mark',
    label: 'FranchiseMark',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 120,
    defaultProps: {
      franchise: 'OAK',
      size: 64,
    },
    propControls: [
      {
        key: 'franchise',
        type: 'select',
        options: ['OAK', 'MIA', 'BRO', 'SAN', 'PRT'],
      },
      { key: 'size', type: 'stepper', min: 24, max: 96, step: 8 },
    ],
    render: (props) => {
      const abbr = props.franchise as string;
      const match = franchises.find((f) => f.abbreviation === abbr);
      // Mock data is the source of truth here; the component only needs the
      // colors and abbreviation to pick its mark.
      const franchise = match ?? {
        abbreviation: abbr,
        primaryColor: gray[300],
        secondaryColor: gray[700],
      };
      return <FranchiseMark franchise={franchise} size={props.size as number} />;
    },
  },
  {
    id: 'live-dot',
    label: 'LiveDot',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 40,
    defaultProps: {
      size: 8,
    },
    propControls: [
      { key: 'size', type: 'stepper', min: 6, max: 16, step: 2 },
    ],
    render: (props) => <LiveDot size={props.size as number} />,
  },
  {
    id: 'stat-value',
    label: 'StatValue',
    category: 'Primitives',
    backgroundColor: gray[50],
    frameMode: 'naked',
    componentWidth: 200,
    defaultProps: {
      label: 'Cap Room',
      value: '$23.50',
      size: 'md',
      layout: 'vertical',
    },
    propControls: [
      { key: 'size', type: 'select', options: ['sm', 'md', 'lg'] },
      { key: 'layout', type: 'select', options: ['vertical', 'horizontal'] },
      { key: 'value', type: 'select', options: ['$23.50', '1,432.8', '7-3', '0.00'] },
    ],
    render: (props) => (
      <StatValue
        label={props.label as string}
        value={props.value as string}
        size={props.size as 'sm' | 'md' | 'lg'}
        layout={props.layout as 'vertical' | 'horizontal'}
      />
    ),
  },
];

// ─── frame constants ─────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 280;
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_RADIUS = 44;

// ─── root ────────────────────────────────────────────────────────────────────

export default function Preview() {
  if (Platform.OS !== 'web') {
    return <WebOnly />;
  }

  const [selectedId, setSelectedId] = useState<string | null>(
    REGISTRY[0]?.id ?? null,
  );
  const [propOverrides, setPropOverrides] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const selected = useMemo(
    () => REGISTRY.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ComponentEntry[]>();
    for (const entry of REGISTRY) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return Array.from(map.entries());
  }, []);

  const currentProps = useMemo(() => {
    if (!selected) return {};
    return { ...selected.defaultProps, ...(propOverrides[selected.id] ?? {}) };
  }, [selected, propOverrides]);

  const setPropValue = (componentId: string, key: string, value: unknown) => {
    setPropOverrides((prev) => ({
      ...prev,
      [componentId]: { ...(prev[componentId] ?? {}), [key]: value },
    }));
  };

  return (
    <View style={styles.root}>
      <Sidebar
        grouped={grouped}
        registryEmpty={REGISTRY.length === 0}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        currentProps={currentProps}
        onPropChange={setPropValue}
      />
      <Canvas selected={selected} props={currentProps} />
    </View>
  );
}

// ─── sidebar ─────────────────────────────────────────────────────────────────

type SidebarProps = {
  grouped: Array<[string, ComponentEntry[]]>;
  registryEmpty: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: ComponentEntry | null;
  currentProps: Record<string, unknown>;
  onPropChange: (componentId: string, key: string, value: unknown) => void;
};

function Sidebar({
  grouped,
  registryEmpty,
  selectedId,
  onSelect,
  selected,
  currentProps,
  onPropChange,
}: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitleEyebrow}>XO PLAY</Text>
        <Text style={styles.sidebarTitle}>Components</Text>
      </View>

      <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarScrollContent}>
        {registryEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No components registered</Text>
            <Text style={styles.emptyStateHint}>
              Add entries to REGISTRY in app/preview.tsx
            </Text>
          </View>
        ) : (
          grouped.map(([category, entries]) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryLabel}>{category}</Text>
              {entries.map((entry) => {
                const active = entry.id === selectedId;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => onSelect(entry.id)}
                    style={[styles.componentItem, active && styles.componentItemActive]}
                  >
                    <Text
                      style={[
                        styles.componentItemText,
                        active && styles.componentItemTextActive,
                      ]}
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        {selected?.propControls && selected.propControls.length > 0 ? (
          <View style={styles.controlsBlock}>
            <Text style={styles.categoryLabel}>Props</Text>
            {selected.propControls.map((control) => (
              <ControlRow
                key={control.key}
                control={control}
                value={currentProps[control.key]}
                onChange={(v) => onPropChange(selected.id, control.key, v)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── prop controls ───────────────────────────────────────────────────────────

type ControlRowProps = {
  control: PropControl;
  value: unknown;
  onChange: (value: unknown) => void;
};

function ControlRow({ control, value, onChange }: ControlRowProps) {
  if (control.type === 'stepper') {
    const numeric = typeof value === 'number' ? value : control.min;
    return (
      <View style={styles.controlRow}>
        <Text style={styles.controlKey}>{control.key}</Text>
        <View style={styles.stepperGroup}>
          <Pressable
            onPress={() => onChange(Math.max(control.min, numeric - control.step))}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{String(numeric)}</Text>
          <Pressable
            onPress={() => onChange(Math.min(control.max, numeric + control.step))}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (control.type === 'toggle') {
    const bool = Boolean(value);
    return (
      <View style={styles.controlRow}>
        <Text style={styles.controlKey}>{control.key}</Text>
        <Switch
          value={bool}
          onValueChange={onChange}
          trackColor={{ false: gray[700], true: gray[400] }}
          thumbColor={gray[0]}
        />
      </View>
    );
  }

  // select
  const current = typeof value === 'string' ? value : control.options[0];
  const idx = control.options.indexOf(current);
  const next = control.options[(idx + 1) % control.options.length];
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlKey}>{control.key}</Text>
      <Pressable onPress={() => onChange(next)} style={styles.selectButton}>
        <Text style={styles.selectButtonText}>{current}</Text>
      </Pressable>
    </View>
  );
}

// ─── canvas ──────────────────────────────────────────────────────────────────

type CanvasProps = {
  selected: ComponentEntry | null;
  props: Record<string, unknown>;
};

function Canvas({ selected, props }: CanvasProps) {
  if (!selected) {
    return (
      <View style={[styles.canvas, { backgroundColor: gray[100] }]}>
        <Text style={styles.canvasEmpty}>Select a component to preview</Text>
      </View>
    );
  }

  return (
    <View style={[styles.canvas, { backgroundColor: selected.backgroundColor }]}>
      {selected.frameMode === 'phone' ? (
        <PhoneFrame>{selected.render(props)}</PhoneFrame>
      ) : (
        <NakedFrame
          width={selected.componentWidth}
          height={selected.componentHeight}
        >
          {selected.render(props)}
        </NakedFrame>
      )}
    </View>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.phoneFrame}>
      <View style={styles.phoneInner}>{children}</View>
    </View>
  );
}

function NakedFrame({
  width,
  height,
  children,
}: {
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  if (width == null) {
    return (
      <View style={styles.nakedError}>
        <Text style={styles.nakedErrorText}>
          naked frame requires componentWidth in the registry entry
        </Text>
      </View>
    );
  }
  return <View style={[styles.nakedFrame, { width, height }]}>{children}</View>;
}

// ─── web-only fallback ───────────────────────────────────────────────────────

function WebOnly() {
  return (
    <View style={styles.webOnly}>
      <Text style={styles.webOnlyTitle}>Web only</Text>
      <Text style={styles.webOnlyBody}>
        The component preview runs only in a browser. Open
        http://localhost:8081/preview.
      </Text>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: gray[100],
  },

  // sidebar
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: gray[950],
    borderRightWidth: 1,
    borderRightColor: gray[700],
  },
  sidebarHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: gray[700],
    gap: spacing.xs,
  },
  sidebarTitleEyebrow: {
    ...typo.mono,
    color: gray[400],
  },
  sidebarTitle: {
    ...typo.headlineXs,
    color: gray[0],
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  categoryBlock: {
    marginBottom: spacing.lg,
  },
  categoryLabel: {
    ...typo.label,
    color: gray[400],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  componentItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  componentItemActive: {
    backgroundColor: gray[800],
  },
  componentItemText: {
    ...typo.body,
    color: gray[300],
  },
  componentItemTextActive: {
    color: gray[0],
  },
  emptyState: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyStateText: {
    ...typo.body,
    color: gray[300],
  },
  emptyStateHint: {
    ...typo.bodyXs,
    color: gray[500],
  },

  // controls
  controlsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: gray[700],
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  controlKey: {
    ...typo.mono,
    color: gray[300],
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: gray[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    ...typo.label,
    color: gray[0],
    lineHeight: 24,
  },
  stepperValue: {
    ...typo.data,
    color: gray[0],
    minWidth: 32,
    textAlign: 'center',
  },
  selectButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: gray[800],
  },
  selectButtonText: {
    ...typo.data,
    color: gray[0],
  },

  // canvas
  canvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  canvasEmpty: {
    ...typo.body,
    color: gray[500],
  },

  // phone frame
  phoneFrame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: PHONE_RADIUS,
    borderWidth: 1,
    borderColor: gray[300],
    backgroundColor: gray[0],
    overflow: 'hidden',
  },
  phoneInner: {
    flex: 1,
  },

  // naked frame
  nakedFrame: {
    backgroundColor: 'transparent',
  },
  nakedError: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: gray[900],
  },
  nakedErrorText: {
    ...typo.body,
    color: gray[0],
  },

  // web-only
  webOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: gray[100],
    gap: spacing.sm,
  },
  webOnlyTitle: {
    ...typo.headlineMd,
    color: gray[900],
  },
  webOnlyBody: {
    ...typo.body,
    color: gray[600],
    textAlign: 'center',
    maxWidth: 400,
  },
});
