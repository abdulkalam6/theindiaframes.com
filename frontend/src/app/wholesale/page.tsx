"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL, apiClient } from "@/lib/api";
import { ArrowLeft, CheckCircle2, FileUp, ShieldAlert, ShieldCheck } from "lucide-react";

interface WholesaleAppStatus {
  id: string;
  business_name: string;
  status: "pending" | "approved" | "rejected";
  gstin: string;
  created_at: string;
}

export default function WholesalePage() {
  const [existingApp, setExistingApp] = useState<WholesaleAppStatus | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string>("framing_shop");
  const [gstin, setGstin] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Cumbum");
  const [state, setState] = useState("Tamil Nadu");
  const [postalCode, setPostalCode] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function checkMyApplication() {
      try {
        const res = await apiClient<WholesaleAppStatus>("wholesale/my-application");
        if (res.data) {
          setExistingApp(res.data);
        }
      } catch {
        // Unauthenticated or no application
      }
    }
    checkMyApplication();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setErrorMsg("Please attach a valid business proof document (PDF or Image).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const applicationPayload = {
      business_name: businessName,
      business_type: businessType,
      gstin: gstin.toUpperCase().trim(),
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      business_address: {
        line1,
        city,
        state,
        postal_code: postalCode,
        country: "IN",
      },
      applicant_note: applicantNote || undefined,
    };

    const formData = new FormData();
    formData.append("application_data", JSON.stringify(applicationPayload));
    formData.append("proof_document", proofFile);

    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/wholesale/apply`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || data.detail || "Application submission failed.");
      } else {
        setSuccessMsg("Wholesale application submitted successfully! It is now under owner review.");
        setExistingApp(data.data);
      }
    } catch {
      setErrorMsg("Failed to connect to wholesale application service. Please ensure you are logged in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="pb-6 border-b border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#E3C27B] hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Wholesale Business Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          For photo framing studios, digital printers and commercial workshops.
        </p>
      </div>

      {/* Existing application notification banner */}
      {existingApp && (
        <div className="mt-6 p-5 rounded-xl bg-[#0b1726] border border-[#C69A48]/40">
          <div className="flex items-start gap-3">
            {existingApp.status === "approved" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-[#C69A48] shrink-0 mt-0.5" />
            )}
            <div>
              <h2 className="text-sm font-semibold text-white">
                Application Status:{" "}
                <span className="uppercase text-[#E3C27B] font-bold">
                  {existingApp.status}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Business: {existingApp.business_name} (GSTIN: {existingApp.gstin})
              </p>
              {existingApp.status === "pending" && (
                <p className="text-xs text-slate-400 mt-1">
                  Your application is currently under owner review. Once approved, wholesale prices and MOQ tiers will automatically appear in your catalogue and cart.
                </p>
              )}
              {existingApp.status === "approved" && (
                <p className="text-xs text-emerald-300 mt-1">
                  Congratulations! Your wholesale account is active. You now receive wholesale unit prices and MOQs directly in the catalogue.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Requirements Callout */}
      {!existingApp && (
        <div className="mt-6 p-5 rounded-xl bg-[#0b1726] border border-[#C69A48]/30">
          <h2 className="text-sm font-semibold text-[#E3C27B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C69A48]" /> Approval Policy &amp; Rules
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Mandatory 15-character valid Indian GSTIN (e.g. 33AAAAA0000A1Z5)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Valid business proof document (GST Certificate, Trade License, or Shop Registration)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Documents are stored privately and inspected solely by the store owner
            </li>
          </ul>
        </div>
      )}

      {/* Application Form */}
      {(!existingApp || existingApp.status === "rejected") && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-[#080B10] p-6 sm:p-8 rounded-2xl border border-slate-800 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Cumbum Framing Works"
                className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Business Type *
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
              >
                <option value="framing_shop">Photo Framing Shop</option>
                <option value="photo_studio">Photo Studio / Lab</option>
                <option value="printing_press">Digital Printing Press</option>
                <option value="gift_shop">Gifting / Art Gallery</option>
                <option value="other">Other Commercial Business</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Indian GSTIN (15 characters) *
            </label>
            <input
              type="text"
              required
              maxLength={15}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="33AAAAA0000A1Z5"
              className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 font-mono tracking-wider focus:border-[#C69A48] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Contact Email *
            </label>
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="business@example.com"
              className="w-full px-3 py-2.5 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
            />
          </div>

          {/* Address Fields */}
          <div className="pt-2 border-t border-slate-800 space-y-4">
            <h3 className="font-semibold text-slate-300">Commercial Address</h3>
            <div>
              <label className="block text-slate-400 mb-1">Address Line 1 *</label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Shop number, street name"
                className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">City / Town *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">PIN Code (6 digits) *</label>
                <input
                  type="text"
                  required
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="625516"
                  className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Proof Document Upload */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-300 font-medium mb-1">
              Upload Business Proof Document (PDF, PNG, JPG, WebP &bull; max 10MB) *
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="file"
                required
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#C69A48]/20 file:text-[#E3C27B] hover:file:bg-[#C69A48]/30 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Additional Notes for Store Owner (Optional)
            </label>
            <textarea
              rows={3}
              value={applicantNote}
              onChange={(e) => setApplicantNote(e.target.value)}
              placeholder="Tell us what framing materials, mouldings or machinery you regularly require..."
              className="w-full px-3 py-2 bg-[#071421] border border-slate-700 rounded-lg text-slate-100 focus:border-[#C69A48] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" />
            {submitting ? "Submitting Application..." : "Submit Wholesale Application"}
          </button>
        </form>
      )}
    </div>
  );
}
