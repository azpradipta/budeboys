"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FieldConfidence } from "@/lib/types";
import { Check, Pencil, CircleAlert } from "lucide-react";

export function ConfidenceField({
  label,
  field,
  onChange,
  onVerify,
}: {
  label: string;
  field: FieldConfidence<string>;
  onChange: (value: string) => void;
  onVerify: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const low = field.needsVerification && !field.verified;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            low ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          confidence {Math.round(field.confidence * 100)}%
        </span>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8"
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => {
              onChange(draft);
              setEditing(false);
              onVerify();
            }}
          >
            Simpan
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{field.value}</span>
          <div className="flex items-center gap-1">
            {field.verified ? (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Check className="size-3.5" /> Terverifikasi
              </span>
            ) : low ? (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <CircleAlert className="size-3.5" /> Perlu dicek
              </span>
            ) : null}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setDraft(field.value);
                setEditing(true);
              }}
              aria-label={`Edit ${label}`}
            >
              <Pencil className="size-3.5" />
            </Button>
            {!field.verified && (
              <Button size="sm" variant="outline" onClick={onVerify}>
                Konfirmasi
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
