"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // Form fields
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [sport, setSport] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If not logged in, send to /auth
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Load profile row for this user
      const { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, sport, bio")
        .eq("id", session.user.id)
        .single();

      // If columns don't exist yet, you'll see an error here — we’ll fix that in step 3.
      if (!error && data) {
        setUsername(data.username ?? "");
        setFullName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setSport((data as any).sport ?? "");
        setBio((data as any).bio ?? "");
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("You are not logged in.");
      router.push("/auth");
      return;
    }

    const updates = {
      id: session.user.id,
      username: username || null,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      sport: sport || null,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      alert("Error saving profile: " + error.message);
      return;
    }

    alert("Profile saved!");
    router.push("/");
  };
async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
  if (!e.target.files || e.target.files.length === 0) return;

  const file = e.target.files[0];
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    alert("Error uploading image");
    return;
  }

  const { data } = supabase.storage
    .from("post-media")
    .getPublicUrl(filePath);

  setAvatarUrl(data.publicUrl);
}
  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-10">
      <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="max-w-xl space-y-3">
          <input
            className="w-full p-3 rounded bg-white text-black placeholder-gray-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-white text-black placeholder-gray-500"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
  type="file"
  accept="image/*"
  onChange={handleAvatarUpload}
/>

          <input
            className="w-full p-3 rounded bg-white text-black placeholder-gray-500"
            placeholder="Sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          />

          <textarea
            className="w-full p-3 rounded bg-white text-black placeholder-gray-500 min-h-[120px]"
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 px-6 py-2 rounded"
            >
              Save Profile
            </button>

            <button
              onClick={() => router.push("/")}
              className="bg-gray-600 px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}