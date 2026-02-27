import { useAuth } from "@/_core/hooks/useAuth";
import { AUTH_SIGNUP_PATH, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function SignIn() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/");
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const canSubmit = useMemo(() => {
    return username.trim().length >= 3 && password.length >= 6;
  }, [username, password]);

  return (
    <div className="min-h-screen w-full app-bg text-white flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-[#111827] border border-white/10 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <h1 className="font-display text-2xl font-semibold mb-2">{APP_TITLE}</h1>
        <p className="text-[#A6B0BE] mb-6">Sign in to continue learning.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Username</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
              className="bg-[#0B0E14] border-white/10 text-white placeholder-[#A6B0BE]"
            />
          </div>
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              className="bg-[#0B0E14] border-white/10 text-white placeholder-[#A6B0BE]"
            />
          </div>
          {signInMutation.error && (
            <p className="text-sm text-red-400">{signInMutation.error.message}</p>
          )}
          <Button
            onClick={() => signInMutation.mutate({ username: username.trim(), password })}
            disabled={!canSubmit || signInMutation.isPending}
            className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
          >
            {signInMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
          <button
            onClick={() => setLocation(AUTH_SIGNUP_PATH)}
            className="w-full text-sm text-[#0EA5FF] hover:underline"
          >
            Create an account
          </button>
        </div>
      </Card>
    </div>
  );
}
