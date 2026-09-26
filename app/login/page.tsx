import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm nextPath={params.next} initialError={params.error} />;
}