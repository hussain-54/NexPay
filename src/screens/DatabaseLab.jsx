import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, BookOpen, RefreshCcw, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Button, Card, ScreenHeader, Badge, Skeleton, Alert } from '../components/ui';
import { checkSupabaseConnection, isSupabaseConfigured } from '../lib/supabase';
import { fetchArticles } from '../lib/supabaseDb';

export const DatabaseLab = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const refresh = async () => {
    setLoading(true);
    const s = await checkSupabaseConnection();
    setStatus(s);
    const rows = await fetchArticles();
    setArticles(rows);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Database" onBack={() => navigate(-1)} right={
        <button onClick={refresh} aria-label="Refresh" className="p-2 rounded-full hover:bg-white/5">
          <RefreshCcw size={18} className={loading ? 'animate-spin text-primary' : 'text-textMuted'} />
        </button>
      } />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-sm mx-auto w-full animate-page pb-8">
        <Card glass className="flex items-start gap-3 p-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Database className="text-primary" size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-bold">Supabase prototype</p>
            <p className="text-xs text-textMuted mt-0.5 break-all">
              {isSupabaseConfigured ? 'Credentials loaded from .env' : 'Missing env keys'}
            </p>
            {status && (
              <Badge variant={status.ok ? 'success' : status.auth ? 'warning' : 'danger'} className="mt-2">
                {status.ok ? 'Ready' : status.auth ? 'Auth only' : 'Offline'}
              </Badge>
            )}
          </div>
        </Card>

        {status && (
          <Alert variant={status.ok ? 'success' : 'warning'} title="Connection">
            {status.message}
          </Alert>
        )}

        <div>
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide mb-2 px-1">Tables</p>
          <Card className="p-0 divide-y divide-white/5 overflow-hidden">
            {loading && !status ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 m-2" />)
            ) : (
              Object.entries(status?.tables || {}).map(([name, state]) => (
                <div key={name} className="flex items-center justify-between px-4 py-3">
                  <span className="font-mono text-sm">{name}</span>
                  {state === true ? (
                    <CheckCircle2 size={16} className="text-accent" />
                  ) : state === false ? (
                    <XCircle size={16} className="text-warning" />
                  ) : (
                    <span className="text-[10px] text-danger max-w-[140px] truncate">{String(state)}</span>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>

        {!status?.ok && (
          <Card className="space-y-3">
            <p className="text-sm font-semibold">Create schema (one-time)</p>
            <ol className="text-xs text-textMuted space-y-2 list-decimal pl-4">
              <li>Open Supabase → SQL Editor</li>
              <li>Paste <span className="text-primary font-mono">supabase/schema.sql</span></li>
              <li>Run, then tap Refresh here</li>
            </ol>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => window.open('https://supabase.com/dashboard/project/crnjmgcdecfwbirvkoka/sql/new', '_blank')}
            >
              <ExternalLink size={14} className="mr-2" /> Open SQL Editor
            </Button>
          </Card>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <BookOpen size={14} className="text-primary" />
            <p className="text-xs font-bold text-textMuted uppercase tracking-wide">Articles ({articles.length})</p>
          </div>
          {articles.length === 0 ? (
            <Card className="text-sm text-textMuted text-center py-8">
              No articles yet — run schema.sql to seed Help Center content.
            </Card>
          ) : (
            <div className="space-y-2">
              {articles.map((a) => (
                <Card key={a.id} interactive onClick={() => setSelected(a)} className="p-3.5">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <Badge variant="primary">{a.category}</Badge>
                  </div>
                  {a.summary && <p className="text-xs text-textMuted mt-1">{a.summary}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <Card glass className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold">{selected.title}</h3>
              <button className="text-xs text-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
            <p className="text-sm text-textMuted leading-relaxed whitespace-pre-wrap">{selected.body}</p>
          </Card>
        )}
      </div>
    </div>
  );
};
