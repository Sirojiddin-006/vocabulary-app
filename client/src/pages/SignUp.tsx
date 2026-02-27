import { useAuth } from "@/_core/hooks/useAuth";
import { AUTH_SIGNIN_PATH, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function SignUp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const signUpMutation = trpc.auth.signUp.useMutation({
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

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  const canSubmit = useMemo(() => {
    return (
      username.trim().length >= 3 &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      !passwordMismatch
    );
  }, [username, password, confirmPassword, passwordMismatch]);

  return (
    <div className="min-h-screen bg-[#0F1720] text-white flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-[#15202B] border-0 p-6">
        <h1 className="text-2xl font-bold mb-2">{APP_TITLE}</h1>
        <p className="text-[#A6B0BE] mb-6">Create your account.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
          </div>
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Email (optional)</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
          </div>
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Username</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
          </div>
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
          </div>
          <div>
            <label className="text-sm text-[#A6B0BE] mb-2 block">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
          </div>
          {passwordMismatch && (
            <p className="text-sm text-red-400">Passwords do not match.</p>
          )}
          {signUpMutation.error && (
            <p className="text-sm text-red-400">{signUpMutation.error.message}</p>
          )}
          <Button
            onClick={() =>
              signUpMutation.mutate({
                username: username.trim(),
                password,
                name: name.trim() || undefined,
                email: email.trim() || undefined,
              })
            }
            disabled={!canSubmit || signUpMutation.isPending}
            className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
          >
            {signUpMutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
          <button
            onClick={() => setLocation(AUTH_SIGNIN_PATH)}
            className="w-full text-sm text-[#0EA5FF] hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </Card>
    </div>
  );
}
