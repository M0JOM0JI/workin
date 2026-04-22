import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Workin</h1>
          <p className="text-gray-500 mt-2">계정을 만들어 시작하세요</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
