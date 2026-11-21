"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";
import { Check, Save, ShieldAlert } from "lucide-react";

interface BusinessSettings {
  business_name: string;
  tagline: string;
  whatsapp_number: string;
  phone_display?: string | null;
  email?: string | null;
  address_line: string;
  map_url?: string | null;
  opening_hours?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<BusinessSettings>({
    business_name: "The India Frames",
    tagline: "Where Memories Become Art",
    whatsapp_number: "919443312345",
    phone_display: "",
    email: "",
    address_line: "Cumbum, Theni District, Tamil Nadu, India",
    map_url: "",
    opening_hours: "",
    instagram_url: "",
    facebook_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient<BusinessSettings>("admin/settings");
        if (res.data) {
          setForm({
            ...res.data,
            phone_display: res.data.phone_display ?? "",
            email: res.data.email ?? "",
            map_url: res.data.map_url ?? "",
            opening_hours: res.data.opening_hours ?? "",
            instagram_url: res.data.instagram_url ?? "",
            facebook_url: res.data.facebook_url ?? "",
          });
        } else {
          setError(res.error?.message ?? "Owner access required.");
        }
      } catch {
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await apiClient<BusinessSettings>("admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          tagline: form.tagline.trim(),
          whatsapp_number: form.whatsapp_number.replace(/\D/g, ""),
          phone_display: form.phone_display?.trim() || "",
          email: form.email?.trim() || "",
          address_line: form.address_line.trim(),
          map_url: form.map_url?.trim() || "",
          opening_hours: form.opening_hours?.trim() || "",
          instagram_url: form.instagram_url?.trim() || "",
          facebook_url: form.facebook_url?.trim() || "",
        }),
      });
      if (res.error) {
        setError(res.error.message);
      } else {
        setSavedMsg(
          "Business settings saved! WhatsApp handoff and Contact page now use these details."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      <AdminNav title="Business Settings" />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-xl bg-emerald-950/60 border border-emerald-800 p-4 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            {savedMsg}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading settings…
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="rounded-xl bg-[#0b1726] border border-slate-800 p-6 space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">
                  Business Name
                </label>
                <input
                  required
                  value={form.business_name}
                  onChange={(e) =>
                    setForm({ ...form, business_name: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Tagline</label>
                <input
                  value={form.tagline}
                  onChange={(e) =>
                    setForm({ ...form, tagline: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  WhatsApp Number (digits with country code, e.g. 9194433XXXXX)
                </label>
                <input
                  required
                  pattern="[0-9]{10,15}"
                  value={form.whatsapp_number}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_number: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Display Phone Number
                </label>
                <input
                  value={form.phone_display ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, phone_display: e.target.value })
                  }
                  placeholder="+91 94433 XXXXX"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Public Contact Email
                </label>
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@theindiaframes.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Opening Hours
                </label>
                <input
                  value={form.opening_hours ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, opening_hours: e.target.value })
                  }
                  placeholder="Mon–Sat: 9:30 AM – 8:30 PM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Store Address</label>
              <textarea
                rows={2}
                value={form.address_line}
                onChange={(e) =>
                  setForm({ ...form, address_line: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">
                  Google Maps URL
                </label>
                <input
                  value={form.map_url ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, map_url: e.target.value })
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Instagram URL
                </label>
                <input
                  value={form.instagram_url ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, instagram_url: e.target.value })
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Facebook URL
                </label>
                <input
                  value={form.facebook_url ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, facebook_url: e.target.value })
                  }
                  placeholder="https://facebook.com/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save Business Settings"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
