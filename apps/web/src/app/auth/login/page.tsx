import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Workin</h1>
          <p className="text-gray-500 mt-2">알바 관리 서비스</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
