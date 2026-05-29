"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.ok) {
      toast.success("로그인했습니다.");
      router.push(searchParams.get("callbackUrl") || "/");
    } else {
      toast.error("이메일 또는 비밀번호를 확인해주세요.");
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="비밀번호"
          />
          <Button type="submit">로그인</Button>
        </form>
      </CardContent>
    </Card>
  );
}
