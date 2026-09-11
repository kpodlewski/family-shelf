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

const ProfileSessionContext = createContext<StoredProfileSession | null>(null);

export function useActiveProfile() {
  return useContext(ProfileSessionContext)?.profile ?? null;
}

export function useActiveProfileSession() {
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
  const [selectedSessionToken, setSelectedSessionToken] = useState<string | null>(null);
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
                setSelectedSessionToken(payload.sessionToken ?? null);
                window.localStorage.setItem(storageKey, JSON.stringify(payload));
              } else {
                setSelectedSessionToken(null);
                window.localStorage.removeItem(storageKey);
              }
            } else {
              setSelectedProfile(storedProfile);
              setSelectedSessionToken(parsed.sessionToken ?? null);
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
      setSelectedSessionToken(payload.sessionToken ?? null);
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
    setSelectedSessionToken(null);
    setPassword("");
    setError(null);
  }

  if (!isHydrated) {
    return <div className="min-h-screen bg-[#070410]" />;
  }

  if (selectedProfile) {
    const canWriteCatalog = storedProfileCan(selectedProfile, "catalog:write");

    return (
      <ProfileSessionContext.Provider
        value={{
          profile: selectedProfile,
          sessionToken: selectedSessionToken,
        }}
      >
        <div className="app-shell">
        <div className="app-topbar px-6 py-3">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#c8bddc]">
                Using <span className="font-medium text-white">{selectedProfile.label}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-medium text-[#f9d7dd]">
                {selectedProfile.role === "guest" ? "Guest" : "Family"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-medium text-[#f9d7dd]">
                {canWriteCatalog ? "Catalog updates allowed" : "Read-only"}
              </span>
            </div>
            <button
              type="button"
              onClick={switchProfile}
              className="w-fit rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white"
            >
              Change profile
            </button>
          </div>
        </div>
        {children}
        </div>
      </ProfileSessionContext.Provider>
    );
  }

  return (
    <main className="login-screen">
      <div className="login-panel">
        <p className="login-kicker">Family Shelf</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Choose your profile</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#d9cced] sm:text-base">
          Family profiles use the shared family password. Guest can browse and search only.
        </p>

        <form onSubmit={submitProfile} className="mt-6 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-white transition hover:bg-white/10 has-[:checked]:border-[#fb7185] has-[:checked]:bg-[#fb7185]/15"
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
                  className="mt-1 accent-[#fb7185]"
                />
                <span>
                  <span className="block font-medium text-white">{profile.label}</span>
                  <span className="block text-sm text-[#c8bddc]">
                    {profile.role === "guest" ? "Read-only guest access" : "Family catalog access"}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {candidateProfile?.requiresFamilyPassword ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#f9d7dd]">Family password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-lg border px-3 py-2 outline-none"
                autoComplete="current-password"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm font-medium text-[#fda4af]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Checking..." : "Enter app"}
          </button>
        </form>
      </div>
    </main>
  );
}
