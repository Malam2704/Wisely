import { useState } from "react";
import { EmptyState } from "../common";
import { makeBlankBenefit } from "../../lib";
import type { Benefit } from "../../types";
import { Button } from "../ui";
import { BenefitForm } from "./BenefitForm";
import { EditableBenefitCard } from "./EditableBenefitCard";

export function BenefitEditor(props: {
  benefits: Benefit[];
  onSave: (benefit: Benefit) => void;
  onDelete: (id: string) => void;
  onResetDefaults: () => void;
}) {
  const [draft, setDraft] = useState<Benefit>(() => makeBlankBenefit());

  return (
    <div className="stack-lg">
      <div className="editor-actions">
        <Button variant="secondary" type="button" onClick={props.onResetDefaults}>
          Reset to example defaults
        </Button>
      </div>

      <BenefitForm
        title="Add benefit"
        benefit={draft}
        saveLabel="Add benefit"
        onChange={setDraft}
        onSubmit={() => {
          if (!draft.name.trim() || !(draft.amount > 0)) return;
          props.onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
          setDraft(makeBlankBenefit());
        }}
      />

      <div className="stack-md">
        <h3 className="section-title">Existing benefits</h3>
        {props.benefits.length === 0 ? (
          <EmptyState text="No benefits configured yet." />
        ) : (
          props.benefits.map((benefit) => (
            <EditableBenefitCard key={benefit.id} benefit={benefit} onSave={props.onSave} onDelete={props.onDelete} />
          ))
        )}
      </div>
    </div>
  );
}
