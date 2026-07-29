import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, Bookmark } from 'lucide-react';
import { Button, Input, ScreenHeader, Select, Avatar, StatusAnimation } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';

export const RecipientDetails = () => {
  const navigate = useNavigate();
  const { addContact } = useStore();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('PK');
  const [note, setNote] = useState('');

  const save = () => {
    if (!name.trim() || !address.trim()) {
      showToast('Name and wallet address required', 'error');
      return;
    }
    addContact({ id: Date.now(), name, country, flag: '', account: address, note });
    navigate('/recipient-saved', { state: { name } });
  };

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Recipient" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-sm mx-auto w-full animate-page">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-3xl bg-primary/15 flex items-center justify-center">
            <UserPlus className="text-primary" size={28} />
          </div>
        </div>
        <Input label="Full name" floating value={name} onChange={e => setName(e.target.value)} />
        <Input label="Solana wallet address" floating value={address} onChange={e => setAddress(e.target.value)} />
        <Select label="Country" value={country} onChange={e => setCountry(e.target.value)} options={[
          { value: 'PK', label: 'Pakistan' }, { value: 'AE', label: 'UAE' }, { value: 'GB', label: 'UK' }, { value: 'US', label: 'USA' }, { value: 'MX', label: 'Mexico' },
        ]} />
        <Input label="Note (optional)" floating value={note} onChange={e => setNote(e.target.value)} />
        <div className="pt-4">
          <Button size="lg" className="w-full font-bold h-14" onClick={save}><Bookmark size={18} className="mr-2" /> Save recipient</Button>
        </div>
      </div>
    </div>
  );
};

export const RecipientSaved = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const name = state?.name || 'Recipient';

  return (
    <div className="flex flex-col h-full bg-bgDark px-6 pt-safe pb-safe animate-page">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <StatusAnimation type="success" size={100} />
        <h1 className="text-2xl font-extrabold text-white mt-8 mb-2">Recipient saved</h1>
        <p className="text-textMuted mb-4">{name} is ready for quick sends</p>
        <Avatar name={name} size="lg" />
      </div>
      <div className="space-y-3 pb-6">
        <Button size="lg" className="w-full" onClick={() => navigate('/send')}>Send money</Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate('/home')}>Done</Button>
      </div>
    </div>
  );
};
