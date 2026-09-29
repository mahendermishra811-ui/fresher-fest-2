import { useState } from "react";
import axios from "axios";
import { Download } from "lucide-react";
import { API } from "@/config";

export default function ExportButton({ path, filename, label, testId }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const response = await axios.get(`${API}${path}`, { withCredentials: true, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // handled by leaving the button re-enabled
    }
    setBusy(false);
  };

  return (
    <button className="outline-btn small" onClick={download} disabled={busy} data-testid={testId}>
      <Download size={14} /> {busy ? "Preparing…" : label}
    </button>
  );
}
