import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BarChart3,
  FileText,
  LoaderCircle,
  LogOut,
  Save,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  presenterLabels,
  presenterTypes,
  type PresenterType,
} from "@/lib/presenter";
import { supabase } from "@/lib/supabase";

type ProfileData = {
  full_name: string | null;
  presenter_type: PresenterType | null;
};

function initialFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export function Profile() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<PresenterType>("educator_trainer");
  const [sessionCount, setSessionCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const [{ data: profileRow }, { data: sessions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, presenter_type")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("sessions").select("id, status").eq("user_id", user.id),
      ]);
      if (!active) return;
      const loadedProfile = profileRow as ProfileData | null;
      const resolvedPersona =
        loadedProfile?.presenter_type ?? "educator_trainer";
      setEmail(user.email ?? "");
      setName(loadedProfile?.full_name ?? "");
      setPersona(resolvedPersona);
      setSessionCount(sessions?.length ?? 0);
      setReportCount(
        sessions?.filter((session) => session.status === "completed").length ??
          0,
      );
      setLoading(false);
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: name.trim() || null,
          presenter_type: persona,
        },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) {
      toast.error(`Unable to save profile: ${error.message}`);
      return;
    }
    toast.success("Profile saved successfully!");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const identity = name.trim() || email || "Attune user";
  if (loading)
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-950 text-zinc-400">
        <LoaderCircle className="size-8 animate-spin text-cyan-300" />
      </main>
    );

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-300"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
        <header className="mt-8 flex flex-wrap items-center gap-5 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8">
          <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-3xl font-bold text-zinc-950">
            {initialFor(identity)}
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
              ATTUNE PROFILE
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {identity}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{email}</p>
            <span className="mt-3 inline-flex rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-200">
              {presenterLabels[persona]}
            </span>
          </div>
        </header>
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
            <UserRound className="size-5 text-cyan-300" />
            <p className="mt-5 text-3xl font-semibold">{sessionCount}</p>
            <p className="mt-1 text-sm text-zinc-400">Total Sessions Hosted</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
            <FileText className="size-5 text-purple-300" />
            <p className="mt-5 text-3xl font-semibold">{reportCount}</p>
            <p className="mt-1 text-sm text-zinc-400">
              Total Reports Generated
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
            <BarChart3 className="size-5 text-emerald-300" />
            <p className="mt-5 text-lg font-semibold">
              {presenterLabels[persona]}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Current Default Persona
            </p>
          </div>
        </section>
        <form
          onSubmit={(event) => void saveProfile(event)}
          className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8"
        >
          <h2 className="text-xl font-semibold">Profile settings</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Set the defaults that personalize new sessions.
          </p>
          <label className="mt-6 block text-sm text-zinc-300">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="mt-4 block text-sm text-zinc-300">
            Default persona
            <select
              value={persona}
              onChange={(event) =>
                setPersona(event.target.value as PresenterType)
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 outline-none focus:border-cyan-400"
            >
              {presenterTypes.map((type) => (
                <option key={type} value={type}>
                  {presenterLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-zinc-200">Account</p>
            <p className="mt-1 text-sm text-zinc-500">
              Sign out from this device when you are finished.
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-red-400"
            >
              <LogOut className="size-4" />
              Log Out
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
