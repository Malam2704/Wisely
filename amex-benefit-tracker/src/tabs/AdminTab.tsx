import { BenefitEditor } from "../components";
import type { Benefit } from "../types";

export function AdminTab(props: {
  benefits: Benefit[];
  onSaveBenefit: (benefit: Benefit) => void;
  onDeleteBenefit: (id: string) => void;
  onResetDefaults: () => void;
}) {
  return (
    <section className="stack-lg">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Benefit configuration</h2>
            <p>
              Define how each Amex credit is detected: cadence, amount, purchase keywords, and refund keywords.
            </p>
          </div>
        </div>
        <BenefitEditor
          benefits={props.benefits}
          onSave={props.onSaveBenefit}
          onDelete={props.onDeleteBenefit}
          onResetDefaults={props.onResetDefaults}
        />
      </section>
    </section>
  );
}
