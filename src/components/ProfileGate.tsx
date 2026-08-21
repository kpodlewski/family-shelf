"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppProfile, ProfileCapability, listAppProfiles } from "@/lib/profiles";

type StoredProfile = Pick<AppProfile, "id" | "label" | "role" | "capabilities">;

type ProfileSessionResponse = {
  profile?: StoredProfile;
  sessionToken?: string | null;
  error?: string;
};

type StoredProfileSession = {
  profile: StoredProfile;
  sessionToken?: string | null;
};

const storageKey = "family-shelf:selected-profile";

const ProfileSessionContext = createContext<StoredProfile | null>(null);

export function useActiveProfile() {
  return useContext(ProfileSessionContext);
}

function storedProfileCan(
  profile: StoredProfile,
  capability: ProfileCapability,
): boolean {
  return profile.capabilities.includes(capability);
}

export function ProfileGate({ children }: { children: ReactNode }) {
  const profiles = useMemo(() => listAppProfiles(), []);
  const [selectedProfile, setSelectedProfile] = useState<StoredProfile | null>(null);
  const [candidateProfileId, setCandidateProfileId] = useState(profiles[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidateProfile = profiles.find((profile) => profile.id === candidateProfileId) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const storedValue = window.localStorage.getItem(storageKey);

      if (storedValue) {
        try {
          const parsed = JSON.parse(storedValue) as Partial<StoredProfileSession>;
          const storedProfile = parsed.profile;
          const stillValid = profiles.some((profile) => profile.id === storedProfile?.id);

          if (storedProfile && stillValid) {
            if (storedProfile.role === "family") {
              const response = await fetch("/api/profile-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  profileId: storedProfile.id,
                  sessionToken: parsed.sessionToken,
                }),
              });
              const payload = (await response.json()) as ProfileSessionResponse;

              if (response.ok && payload.profile) {
                setSelectedProfile(payload.profile);
                window.localStorage.setItem(storageKey, JSON.stringify(payload));
              } else {
                window.localStorage.removeItem(storageKey);
              }
            } else {
              setSelectedProfile(storedProfile);
            }
          } else {
            window.localStorage.removeItem(storageKey);
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [profiles]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: candidateProfileId,
          password: candidateProfile?.requiresFamilyPassword ? password : undefined,
        }),
      });
      const payload = (await response.json()) as ProfileSessionResponse;

      if (!response.ok || !payload.profile) {
        setError(payload.error ?? "Could not enter with this profile.");
        return;
      }

      setSelectedProfile(payload.profile);
      setPassword("");
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      setError("Could not reach the profile check. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchProfile() {
    window.localStorage.removeItem(storageKey);
    setSelectedProfile(null);
    setPassword("");
    setError(null);
  }

  if (!isHydrated) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (selectedProfile) {
    const canWriteCatalog = storedProfileCan(selectedProfile, "catalog:write");

    return (
      <ProfileSessionContext.Provider value={selectedProfile}>
        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">
                Using <span className="font-medium text-slate-900">{selectedProfile.label}</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                {selectedProfile.role === "guest" ? "Guest" : "Family"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                {canWriteCatalog ? "Catalog updates allowed" : "Read-only"}
              </span>
            </div>
            <button
              type="button"
              onClick={switchProfile}
              className="w-fit rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Change profile
            </button>
          </div>
        </div>
        {children}
      </ProfileSessionContext.Provider>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Family Shelf</p>
        <h1 className="mt-3 text-3xl font-semibold">Choose your profile</h1>
        <p className="mt-2 text-slate-600">
          Family profiles use the shared family password. Guest can browse and search only.
        </p>

        <form onSubmit={submitProfile} className="mt-6 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
              >
                <input
                  type="radio"
                  name="profile"
                  value={profile.id}
                  checked={candidateProfileId === profile.id}
                  onChange={() => {
                    setCandidateProfileId(profile.id);
                    setError(null);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-slate-900">{profile.label}</span>
                  <span className="block text-sm text-slate-500">
                    {profile.role === "guest" ? "Read-only guest access" : "Family catalog access"}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {candidateProfile?.requiresFamilyPassword ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Family password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                autoComplete="current-password"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Checking..." : "Enter app"}
          </button>
        </form>
      </div>
    </main>
  );
}
