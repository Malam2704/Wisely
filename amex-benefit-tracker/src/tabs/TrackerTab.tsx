import { BenefitStatusCard, EmptyState } from "../components";
import type { TrackerSummaryItem } from "../types";

export function TrackerTab(props: { trackerSummaries: TrackerSummaryItem[] }) {
  return (
    <section className="stack-lg">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Current cycle status</h2>
            <p>
              Each benefit is matched against transactions in its current cycle window using merchant/refund keywords.
            </p>
          </div>
        </div>
        {props.trackerSummaries.length === 0 ? (
          <EmptyState text="No active benefits yet. Add one in the Admin tab." />
        ) : (
          <div className="benefit-grid">
            {props.trackerSummaries.map((item) => (
              <BenefitStatusCard key={item.benefit.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Bank account connection (next step)</h2>
            <p>
              The app is ready to evaluate transactions, but bank sync is not wired yet. For now use manual entries or CSV imports.
            </p>
          </div>
        </div>
        <div className="integration-grid">
          <div className="integration-card">
            <h3>Current flow</h3>
            <ul>
              <li>Add benefit rules in Admin</li>
              <li>Import transaction CSV or enter manually</li>
              <li>App auto-updates current cycle statuses</li>
            </ul>
          </div>
          <div className="integration-card">
            <h3>Future bank sync</h3>
            <ul>
              <li>Plaid or MX connection</li>
              <li>Merchant normalization rules</li>
              <li>Scheduled refresh and notifications</li>
            </ul>
          </div>
        </div>
      </section>
    </section>
  );
}
