import { Button, Input, Label, Textarea } from "../ui";

export function CsvImportPanel(props: {
  csvText: string;
  setCsvText: (value: string) => void;
  onImport: () => void;
  onFileSelect: (file: File) => void;
  warnings: string[];
}) {
  return (
    <div className="subpanel">
      <h3>CSV import</h3>
      <Label>
        Upload CSV file
        <Input
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) props.onFileSelect(file);
            e.currentTarget.value = "";
          }}
        />
      </Label>
      <Label>
        Or paste CSV text
        <Textarea
          rows={8}
          value={props.csvText}
          onChange={(e) => props.setCsvText(e.target.value)}
          placeholder={"date,description,amount,type\n2026-02-01,WALMART PLUS MONTHLY MEMBERSHIP,13.99,purchase\n2026-02-03,AMEX WALMART+ CREDIT,13.99,refund"}
        />
      </Label>
      <Button type="button" onClick={props.onImport} disabled={!props.csvText.trim()}>
        Import pasted CSV
      </Button>
      {props.warnings.length > 0 ? (
        <div className="warning-box">
          <strong>Import notes</strong>
          <ul>
            {props.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
