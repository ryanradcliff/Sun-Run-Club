import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        loadPlayers();
        loadDeposits();
      }
    };
    getSession();
  }, [router]);

  const loadPlayers = async () => {
    const { data, error } = await supabase.from('players').select('*');
    if (!error) setPlayers(data);
  };

  const loadDeposits = async () => {
    const { data, error } = await supabase.from('deposits').select('*').order('timestamp', { ascending: false });
    if (!error) setHistory(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('players').insert([{ name }]);
    if (!error) {
      setName('');
      loadPlayers();
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!targetId || !amount) return;

    const { error: depError } = await supabase.from('deposits').insert([
      {
        player_id: targetId,
        amount: parseFloat(amount),
        method: 'Manual',
        created_by: user?.email,
        timestamp: new Date().toISOString()
      }
    ]);

    const player = players.find(p => p.id === targetId);
    const newBalance = (player.balance || 0) + parseFloat(amount);
    const { error: updateError } = await supabase.from('players').update({ balance: newBalance }).eq('id', targetId);

    if (!depError && !updateError) {
      setAmount('');
      setTargetId('');
      loadPlayers();
      loadDeposits();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-blue-600">Logout</button>
      </div>

      <form onSubmit={handleAddPlayer} className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Add Player</h2>
        <input
          className="border p-2 mr-2"
          placeholder="Player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
      </form>

      <form onSubmit={handleDeposit} className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Credit Chips</h2>
        <select
          className="border p-2 mr-2"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          required
        >
          <option value="">Select player</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          step="any"
          className="border p-2 mr-2"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Credit</button>
      </form>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Players</h2>
        <ul className="border rounded p-2 space-y-1">
          {players.map(p => (
            <li key={p.id} className="flex justify-between">
              <span>{p.name}</span>
              <span>{p.balance || 0} chips</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Deposit History</h2>
        <ul className="border rounded p-2 space-y-1">
          {history.map(d => (
            <li key={d.id} className="flex justify-between text-sm">
              <span>{new Date(d.timestamp).toLocaleString()}</span>
              <span>{players.find(p => p.id === d.player_id)?.name || 'Unknown'}: {d.amount} by {d.created_by}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}