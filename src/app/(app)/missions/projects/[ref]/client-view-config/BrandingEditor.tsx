"use client";

import { useState, useTransition } from "react";
import { fieldInputClass } from "@/components/ui/Modal";
import type { ProjectBranding } from "@/lib/data/project";
import { updateProjectBranding } from "./actions";

const DEFAULT_ACCENT = "#f2583e";

/** Logo, one accent color, a welcome headline, and the client name shown
 * next to that logo (editable, since the client's real record name
 * isn't always what should show on a co-branded portal header) plus a
 * toggle for whether that name shows at all. Deliberately not a
 * design-tokens upload or a block canvas: those were tried and felt too
 * complex to use day to day. Leave everything blank and the portal
 * renders exactly as it always has. */
export function BrandingEditor({
  projectId,
  projectRef,
  branding,
  realClientName,
}: {
  projectId: string;
  projectRef: string;
  branding: ProjectBranding;
  /** The client's actual record name (projects.clientName) -- shown as
   * the field's placeholder so an admin who's never touched this sees
   * what's currently displayed, and used as the save value when the
   * field is left blank (an empty override should mean "use the real
   * name", not "show nothing"). */
  realClientName: string;
}) {
  const [logoDataUrl, setLogoDataUrl] = useState(branding.logoDataUrl);
  const [accentColor, setAccentColor] = useState(branding.accentColor ?? DEFAULT_ACCENT);
  const [headline, setHeadline] = useState(branding.welcomeHeadline ?? "");
  const [displayName, setDisplayName] = useState(branding.clientDisplayName ?? "");
  const [showClientName, setShowClientName] = useState(branding.showClientName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(patch: Parameters<typeof updateProjectBranding>[2]) {
    setError(null);
    startTransition(async () => {
      try {
        await updateProjectBranding(projectId, projectRef, patch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUrl} alt="" className="w-9 h-9 rounded-[6px] object-cover border border-line" />
        ) : (
          <div className="w-9 h-9 rounded-[6px] border border-dashed border-line flex-none" />
        )}
        <div className="flex flex-col gap-1">
          <input
            type="file"
            accept="image/*"
            className="text-[11px]"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = String(reader.result);
                setLogoDataUrl(dataUrl);
                save({ logoDataUrl: dataUrl, logoFilename: file.name });
              };
              reader.readAsDataURL(file);
            }}
          />
          {logoDataUrl ? (
            <button
              type="button"
              onClick={() => {
                setLogoDataUrl(null);
                save({ logoDataUrl: null, logoFilename: null });
              }}
              className="font-mono text-[9px] text-muted hover:text-block-fg self-start"
            >
              REMOVE LOGO
            </button>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-[12px]">
        <input
          type="color"
          value={accentColor}
          onChange={(e) => {
            setAccentColor(e.target.value);
            save({ accentColor: e.target.value });
          }}
          className="w-8 h-8 rounded-[6px] border border-line cursor-pointer"
        />
        <span className="text-ink">Accent color</span>
      </label>

      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        onBlur={() => save({ welcomeHeadline: headline || null })}
        placeholder="Welcome headline shown on the portal (optional)"
        className={fieldInputClass}
      />

      <div className="flex flex-col gap-1.5 pt-1 border-t border-line-soft">
        <span className="font-mono text-[9px] tracking-[.06em] text-muted">CLIENT NAME NEXT TO THE LOGO</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => save({ clientDisplayName: displayName.trim() || null })}
          placeholder={realClientName}
          disabled={!showClientName}
          className={`${fieldInputClass} disabled:opacity-50`}
        />
        <label className="flex items-center gap-2 text-[11.5px] text-muted">
          <input
            type="checkbox"
            checked={showClientName}
            onChange={(e) => {
              setShowClientName(e.target.checked);
              save({ showClientName: e.target.checked });
            }}
          />
          Show the name — off shows the logo alone
        </label>
      </div>

      {error ? <p className="text-[11.5px] text-block-fg">{error}</p> : null}
      {isPending ? <p className="text-[10.5px] text-muted">Saving...</p> : null}
    </div>
  );
}
