"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { updateProductGateEvidence } from "../actions";
import type { ProductDetail } from "@/lib/data/product";

export function GateEvidenceForm({ product }: { product: ProductDetail }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          await updateProductGateEvidence(product.id, formData);
          setSaved(true);
        });
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">G1 · BUSINESS CASE — PROBLEM, BUYER, PRICE, SIZE</span>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="PROBLEM">
            <textarea name="businessCaseProblem" rows={2} defaultValue={product.businessCase.problem ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="BUYER">
            <input name="businessCaseBuyer" defaultValue={product.businessCase.buyer ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="PRICE">
            <input name="businessCasePrice" defaultValue={product.businessCase.price ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="SIZE">
            <input name="businessCaseSize" defaultValue={product.businessCase.size ?? ""} className={fieldInputClass} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">G2 · BUILD COMMITTED — SCOPE, TEAM, DATE, KILL CRITERIA</span>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="SCOPE">
            <textarea name="buildScope" rows={2} defaultValue={product.buildScope ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="KILL CRITERIA">
            <textarea name="killCriteria" rows={2} defaultValue={product.killCriteria ?? ""} className={fieldInputClass} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">G3 · DESIGN PARTNER PROVEN — ONE REAL CLIENT, MEASURED OUTCOME</span>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Field label="DESIGN PARTNER MISSION ID (OPTIONAL)">
            <input
              name="designPartnerProjectId"
              defaultValue={product.designPartner.projectId ?? ""}
              placeholder="Paste the mission's id"
              className={fieldInputClass}
            />
            {product.designPartner.projectRef ? (
              <span className="text-[10.5px] text-muted">Currently: {product.designPartner.projectRef}</span>
            ) : null}
          </Field>
          <Field label="MEASURED OUTCOME">
            <textarea name="designPartnerOutcome" rows={2} defaultValue={product.designPartner.outcome ?? ""} className={fieldInputClass} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">G4 · LAUNCH READY — PRICING, COLLATERAL, SUPPORT MODEL</span>
        <div className="grid sm:grid-cols-3 gap-2.5">
          <Field label="PRICING">
            <input name="pricing" defaultValue={product.launchReady.pricing ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="COLLATERAL URL">
            <input name="collateralUrl" defaultValue={product.launchReady.collateralUrl ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="SUPPORT MODEL">
            <input name="supportModel" defaultValue={product.launchReady.supportModel ?? ""} className={fieldInputClass} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save evidence"}
        </Button>
        {saved && !isPending ? <span className="text-[11.5px] text-muted">Saved.</span> : null}
      </div>
    </form>
  );
}
