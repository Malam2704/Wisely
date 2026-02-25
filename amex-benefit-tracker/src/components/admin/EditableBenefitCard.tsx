import { useEffect, useState } from "react";
import type { Benefit } from "../../types";
import { Button, Card } from "../ui";
import { BenefitForm } from "./BenefitForm";

export function EditableBenefitCard(props: {
  benefit: Benefit;
  onSave: (benefit: Benefit) => void;
  onDelete: (id: string) => void;
}) {
  const [local, setLocal] = useState<Benefit>(props.benefit);

  useEffect(() => {
    setLocal(props.benefit);
  }, [props.benefit]);

  return (
    <Card className="subpanel">
      <BenefitForm
        title={props.benefit.name || "Benefit"}
        benefit={local}
        saveLabel="Save changes"
        onChange={setLocal}
        onSubmit={() => {
          if (!local.name.trim() || !(local.amount > 0)) return;
          props.onSave({ ...local, name: local.name.trim(), description: local.description.trim() });
        }}
      />
      <div className="card-row-actions">
        <Button className="text-button" variant="ghost" size="sm" type="button" onClick={() => setLocal(props.benefit)}>
          Revert
        </Button>
        <Button className="text-button danger-text" variant="ghost" size="sm" type="button" onClick={() => props.onDelete(props.benefit.id)}>
          Delete benefit
        </Button>
      </div>
    </Card>
  );
}
