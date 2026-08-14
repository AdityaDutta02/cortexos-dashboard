/** Barrel for the hand-built component library. No external UI dependency. */

export { Button, Spinner } from "./Button";
export { CAP, CappedList } from "./CappedList";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./Button";
export { Card, Eyebrow, Module, ModuleAdd, Panel, Stat } from "./Surface";
export {
  Badge,
  Chip,
  Dot,
  DotBullet,
  HealthBadge,
  MatchedByBadge,
  ProposedBadge,
  RunStatusBadge,
  TierBadge,
} from "./Badge";
export type { BadgeTone } from "./Badge";
export { Meter, ProgressBar } from "./Progress";
export { EmptyState, ErrorState, RelativeTime, Skeleton, SkeletonLines } from "./Feedback";
export { Field, Input, Select, Textarea, Toggle } from "./Field";
export { Table } from "./Table";
export type { Column, TableProps } from "./Table";
export { Dialog } from "./Dialog";
export { PreflightDialog } from "./Preflight";
export { ToastProvider, useToast } from "./Toast";
export type { Toast, ToastTone } from "./Toast";
export { Tabs } from "./Tabs";
export type { TabItem } from "./Tabs";
export { Term, Tooltip } from "./Tooltip";
export { Popover } from "./Popover";
