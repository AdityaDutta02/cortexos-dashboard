/** Skills, the vault profile, settings and re-auth. */

import type {
  CortexConfig,
  DataSource,
  DeviceToken,
  IssuedDevice,
  SkillInfo,
  VaultProfile,
} from "cortexos-types";

import { CONFIG } from "../fixtures/config";
import { SKILLS } from "../fixtures/sources";
import { settle } from "./options";

/**
 * The adopted vault's own layout, mirroring the shape the live agent returns
 * from `GET /api/vault/profile`. `folders.insights` is the real answer to
 * "where do insights live" — matching the folder name semantically is correct
 * for one vault and a guess for the next.
 */
const VAULT_PROFILE: VaultProfile = {
  root: "/vault",
  label: "Second Brain",
  folders: {
    maps: "00 Maps",
    projects: "10 Projects",
    areas: "20 Areas",
    resources: "30 Resources",
    archive: "40 Archive",
    ledgers: "50 Ledgers",
    posts: "60 Posts",
    insights: "Insights",
    inbox: "_Inbox",
  },
  ignore: [".git", ".obsidian", ".claude"],
  nodeIds: "basename",
  unclassified: ["70 Constellations", "Log"],
};

/**
 * Mutable on purpose: issue and revoke have to be visible to a later `list` or
 * the panel cannot be exercised against the mock at all.
 */
const DEVICES: DeviceToken[] = [
  {
    label: "iPhone",
    createdAt: "2026-08-02T09:14:00.000Z",
    lastUsedAt: "2026-08-12T06:41:00.000Z",
    handle: "a71c9f04",
  },
  {
    label: "Old laptop",
    createdAt: "2026-06-11T15:02:00.000Z",
    revokedAt: "2026-07-28T11:20:00.000Z",
    handle: "3d92be55",
  },
];

export const configMock: Pick<
  DataSource,
  | "listSkills"
  | "getSkillsReport"
  | "getVaultProfile"
  | "getConfig"
  | "updateConfig"
  | "startReauth"
  | "listDevices"
  | "issueDevice"
  | "revokeDevice"
> = {
  async listDevices(): Promise<DeviceToken[]> {
    return settle("config", () => [...DEVICES]);
  },

  /**
   * Mirrors the real contract's one-shot reveal: a fresh plaintext that is not
   * added to `DEVICES` in any recoverable form, so a UI built against the mock
   * cannot accidentally depend on reading it back.
   */
  async issueDevice(label: string): Promise<IssuedDevice> {
    return settle("config", () => {
      const handle = Math.random().toString(16).slice(2, 10);
      const device: DeviceToken = { label, createdAt: new Date().toISOString(), handle };
      DEVICES.push(device);
      return { token: `cxd_${handle}${"x".repeat(24)}`, device };
    });
  },

  async revokeDevice(handle: string): Promise<{ revoked: boolean }> {
    return settle("config", () => {
      const device = DEVICES.find((d) => d.handle === handle && !d.revokedAt);
      if (device) device.revokedAt = new Date().toISOString();
      return { revoked: Boolean(device) };
    });
  },

  /** Skills that exist on disk. The mock owns one, like the real repo does. */
  async listSkills(): Promise<SkillInfo[]> {
    return settle("config", SKILLS);
  },

  /**
   * `installed` carries full records rather than names, so a row never needs a
   * second fetch. `unlisted` is what discovery finds outside `cortex.yaml` —
   * on a real machine that is most of them.
   */
  async getSkillsReport(): Promise<{
    installed: SkillInfo[];
    missing: string[];
    unlisted: string[];
  }> {
    return settle("config", () => ({
      installed: SKILLS,
      missing: CONFIG.skills.enabled.filter((name) => !SKILLS.some((s) => s.name === name)),
      unlisted: SKILLS.filter((s) => !CONFIG.skills.enabled.includes(s.name)).map((s) => s.name),
    }));
  },

  async getVaultProfile(): Promise<VaultProfile> {
    return settle("config", VAULT_PROFILE);
  },

  async getConfig(): Promise<CortexConfig> {
    return settle("config", CONFIG);
  },

  async updateConfig(patch: Partial<CortexConfig>): Promise<CortexConfig> {
    return settle("config", () => ({ ...CONFIG, ...patch }));
  },

  async startReauth(): Promise<{ verificationUrl: string; userCode: string; expiresAt: string }> {
    return settle("config", {
      verificationUrl: "https://claude.ai/device",
      userCode: "TQVB-XKMR",
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  },
};
