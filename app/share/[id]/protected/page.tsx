"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function ProtectedSharePage({ params }: { params: { id: string } }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/share?id=${params.id}&password=${encodeURIComponent(password)}`);
      const data = await response.json();

      if (response.ok) {
        router.push(`/share/${params.id}?key=${password}`);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (error) {
      setError('Failed to verify password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-lg">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-white/10 p-3">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mb-2 text-center text-xl font-semibold text-white">
          Protected Share
        </h2>
        <p className="mb-6 text-center text-sm text-white/70">
          This shared code is password protected
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
            className="w-full rounded-lg bg-white/5 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full rounded-lg bg-blue-500 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Access Code'}
          </button>
        </form>
      </div>
    </div>
  );
}