'use client';

import { useState } from 'react';

export function AddFolderForm({ onFolderCreated }: { onFolderCreated?: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      setName('');
      onFolderCreated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-2 border rounded">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du dossier"
        className="w-full p-1 text-sm border rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full bg-black text-white py-1 rounded text-sm"
      >
        {loading ? 'Création…' : 'Créer'}
      </button>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </form>
  );
}
