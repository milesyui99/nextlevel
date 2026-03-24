
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function Home() {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
const [session, setSession] = useState<Session | null>(null);
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => subscription.unsubscribe();
}, []);

  // Load posts from Supabase
  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Create new post
  const handlePost = async () => {
    if (!content) return;

    await supabase.from("posts").insert([
      {
        content,
      },
    ]);

    setContent("");
    fetchPosts();
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-10">
      <h1 className="text-4xl font-bold mb-2">NextLevel</h1>
      <p className="text-gray-400 mb-8">
        Built for athletes. Built to connect.
      </p>

      {session ? (
  <div className="bg-[#1e293b] p-6 rounded-xl mb-10">

    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="What's happening?"
      className="w-full p-4 rounded bg-[#334155] text-white mb-4"
    />
    <button
      onClick={handlePost}
      className="bg-blue-600 px-6 py-2 rounded"
    >
      Post
    </button>

    <button
      onClick={() => supabase.auth.signOut()}
      className="ml-4 text-red-400"
    >
      Sign Out
    </button>
  </div>
) : (
  <div className="mb-10">
    <button
      onClick={() => (window.location.href = "/auth")}
      className="bg-green-600 px-6 py-2 rounded"
    >
      Sign In
    </button>
  </div>
)}
<button
  onClick={() => (window.location.href = "/profile")}
  className="ml-4 bg-gray-700 px-4 py-2 rounded"
>
  Edit Profile
</button>



      {/* POSTS LIST */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-[#1e293b] p-4 rounded-lg"
          >
            {post.content}
          </div>
        ))}
      </div>
    </main>
  );
};

