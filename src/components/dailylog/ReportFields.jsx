import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Sparkles, Loader2 } from 'lucide-react';
import { draftExecutiveSummary, draftLookahead } from '@/lib/gemini';
import { format } from 'date-fns';

export default function ReportFields({ log, project, entries, issues, punchItems, onUpdate }) {
  const [summary, setSummary] = useState(log?.executive_summary || '');
  const [lookahead, setLookahead] = useState(log?.lookahead || '');
  const [dirty, setDirty] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingLookahead, setLoadingLookahead] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(log?.executive_summary || '');
    setLookahead(log?.lookahead || '');
    setDirty(false);
  }, [log]);

  const handleSave = () => {
    onUpdate({ executive_summary: summary, lookahead });
    setDirty(false);
  };

  const handleDraftSummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const logDate = log?.log_date ? format(new Date(log.log_date), 'EEEE, MMMM d, yyyy') : '';
      const text = await draftExecutiveSummary({
        projectName: project?.project_name || '',
        logDate,
        entries,
        issues,
      });
      setSummary(text);
      setDirty(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDraftLookahead = async () => {
    setLoadingLookahead(true);
    setError('');
    try {
      const text = await draftLookahead({
        projectName: project?.project_name || '',
        issues,
        punchItems,
      });
      setLookahead(text);
      setDirty(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLookahead(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Executive Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Executive Summary
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDraftSummary}
            disabled={loadingSummary || !entries.length}
            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
            title={!entries.length ? 'Add activity entries first' : 'Draft with AI'}
          >
            {loadingSummary
              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Drafting...</>
              : <><Sparkles className="h-3 w-3 mr-1" /> Draft with AI</>}
          </Button>
        </div>
        <Textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setDirty(true); }}
          placeholder="Write an end-of-day executive summary, or tap 'Draft with AI' to generate one from today's entries..."
          className="bg-secondary border-border min-h-[100px] resize-none"
        />
      </div>

      {/* Lookahead */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Lookahead
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDraftLookahead}
            disabled={loadingLookahead}
            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
          >
            {loadingLookahead
              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Drafting...</>
              : <><Sparkles className="h-3 w-3 mr-1" /> Draft with AI</>}
          </Button>
        </div>
        <Textarea
          value={lookahead}
          onChange={(e) => { setLookahead(e.target.value); setDirty(true); }}
          placeholder="Notes for upcoming work, or tap 'Draft with AI' to generate from open issues and punch items..."
          className="bg-secondary border-border min-h-[80px] resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Save */}
      {dirty && (
        <Button onClick={handleSave} className="w-full h-12 bg-primary text-primary-foreground font-semibold">
          <Save className="h-4 w-4 mr-2" /> Save Report Fields
        </Button>
      )}
    </div>
  );
}
