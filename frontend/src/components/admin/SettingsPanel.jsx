import { useEffect, useState } from "react";
import axios from "axios";
import { BellRing, BellOff, Save } from "lucide-react";
import { API } from "@/config";

export default function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ upi_id: "", whatsapp_number: "" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/admin`, { withCredentials: true })
      .then((response) => {
        setSettings(response.data);
        setForm({ upi_id: response.data.upi_id, whatsapp_number: response.data.whatsapp_number });
      })
      .catch(() => setMessage({ type: "error", text: "Could not load settings." }));
  }, []);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await axios.put(`${API}/settings`, form, { withCredentials: true });
      setSettings(response.data);
      setForm({ upi_id: response.data.upi_id, whatsapp_number: response.data.whatsapp_number });
      setMessage({ type: "ok", text: "Saved. Guests now see these details on the party page." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.detail || "Could not save. Check the values and try again." });
    }
    setSaving(false);
  };

  if (!settings && !message.text) return <p className="admin-empty" data-testid="settings-loading">Loading settings…</p>;

  return (
    <div className="settings-grid" data-testid="settings-panel">
      <form className="settings-card" onSubmit={save}>
        <div className="modal-kicker">PAYMENT & CONTACT</div>
        <h3>Where guests pay and reach you</h3>
        <label>UPI ID <span>(shown in the booking window)</span>
          <input name="upi_id" value={form.upi_id} onChange={update} placeholder="yourname@upi" data-testid="settings-upi-input" />
        </label>
        <label>WHATSAPP NUMBER <span>(with country code, e.g. 9198xxxxxxxx)</span>
          <input name="whatsapp_number" value={form.whatsapp_number} onChange={update} placeholder="91XXXXXXXXXX" data-testid="settings-whatsapp-input" />
        </label>
        {message.text && (
          <div className={message.type === "ok" ? "form-ok" : "form-error"} data-testid="settings-message">{message.text}</div>
        )}
        <button className="submit-btn" type="submit" disabled={saving} data-testid="settings-save-button">
          <Save size={16} /> {saving ? "Saving…" : "Save details"}
        </button>
      </form>

      <div className="settings-card" data-testid="alerts-card">
        <div className="modal-kicker">BOOKING ALERTS</div>
        <h3>WhatsApp alert on every booking</h3>
        {settings?.alerts_configured ? (
          <p className="alert-status on" data-testid="alerts-status"><BellRing size={16} /> Active — alerts go to +{settings.whatsapp_number}</p>
        ) : (
          <p className="alert-status off" data-testid="alerts-status"><BellOff size={16} /> Not connected yet</p>
        )}
        <p className="settings-help">
          Alerts are sent through Twilio WhatsApp. Add <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> and{" "}
          <code>TWILIO_WHATSAPP_FROM</code> to the backend environment and they switch on automatically — messages go to the WhatsApp number saved on the left.
        </p>
        {settings?.last_alert && <p className="settings-help" data-testid="alerts-last">Last alert: {settings.last_alert}</p>}
      </div>
    </div>
  );
}
