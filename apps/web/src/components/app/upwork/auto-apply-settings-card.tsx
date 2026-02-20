"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { IconRobot } from "@tabler/icons-react";
import { useState, useEffect } from "react";

export function AutoApplySettingsCard() {
  const settings = useQuery(api.autoApply.getSettings);
  const updateSettings = useMutation(api.autoApply.updateSettings);

  const [minBudget, setMinBudget] = useState("5000");
  const [maxPerRun, setMaxPerRun] = useState("3");
  const [videoLink, setVideoLink] = useState("");
  const [contextId, setContextId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setMinBudget(String(settings.minBudget));
      setMaxPerRun(String(settings.maxApplicationsPerRun));
      setVideoLink(settings.defaultVideoLink ?? "");
      setContextId(settings.browserbaseContextId ?? "");
    }
  }, [settings]);

  if (settings === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <div className="px-6 pb-6 space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    );
  }

  const enabled = settings?.enabled ?? false;
  const boostToFirstPlace = settings?.boostToFirstPlace ?? true;

  async function handleToggle(checked: boolean) {
    await updateSettings({ enabled: checked });
  }

  async function handleBoostToggle(checked: boolean) {
    await updateSettings({ boostToFirstPlace: checked });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({
        minBudget: Math.max(0, parseInt(minBudget, 10) || 5000),
        maxApplicationsPerRun: Math.max(1, Math.min(10, parseInt(maxPerRun, 10) || 3)),
        defaultVideoLink: videoLink.trim() || undefined,
        browserbaseContextId: contextId.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconRobot className="size-5" />
            Auto-Apply
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-apply-toggle" className="text-sm text-muted-foreground">
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="auto-apply-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>
        <CardDescription>
          Automatically discover and queue proposals for high-budget jobs. Runs
          twice daily with manual approval before each submission.
        </CardDescription>
      </CardHeader>

      <div className="px-6 pb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="min-budget">Minimum budget ($)</Label>
            <Input
              id="min-budget"
              type="number"
              min={0}
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-per-run">Max applications per run</Label>
            <Input
              id="max-per-run"
              type="number"
              min={1}
              max={10}
              value={maxPerRun}
              onChange={(e) => setMaxPerRun(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-link">Default video link (Loom/YouTube)</Label>
          <Input
            id="video-link"
            type="url"
            placeholder="https://www.loom.com/share/..."
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="context-id">Browserbase context ID</Label>
          <Input
            id="context-id"
            type="text"
            placeholder="ctx_..."
            value={contextId}
            onChange={(e) => setContextId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Persistent browser session for Upwork login. Set up once via
            Browserbase Live View.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="boost-toggle"
              checked={boostToFirstPlace}
              onCheckedChange={handleBoostToggle}
            />
            <Label htmlFor="boost-toggle">Boost to 1st place</Label>
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
