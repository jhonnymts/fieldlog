import React, { useState } from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X, Clock, Sparkles, Loader2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cleanupEntry } from '@/lib/gemini';

export default function EntryFeed({ logId, projectId, entries, punchItems = [] }) {
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState('');
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleaningEditId, setCleaningEditId] = useState(null);
  const [promotingId, setPromotingId] = useState(null);
  const [promotedIds, setPromotedIds] = useState(new Set());

  const createMutation = useMutation({
    mutationFn: (data) => fieldlog.entities.LogEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logEntries', logId] }); setNewEntry(''); },
  });

  const [saving, setSaving] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => fieldlog.entities.LogEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logEntries', logId] }),
  });

  const promoteMutation = useMutation({
    mutationFn: async (entry) => {
      const existing = await fieldlog.entities.PunchItem.filter({ project_id: projectId });
      const nextNum = (existing?.length ?? 0) + 1;
      return fieldlog.entities.PunchItem.create({
        project_id: projectId,
        item_number: nextNum,
        description: entry.content,
        status: 'Open',
        owner: '',
        target_date: '',
      });
    },
    onSuccess: (_, entry) => {
      setPromotedIds((prev) => new Set([...prev, entry.id]));
      setPromotingId(null);
      queryClient.invalidateQueries({ queryKey: ['punchItems', projectId] });
    },
    onError: () => setPromotingId(null),
  });

  // An entry is already on the punch list if its text matches an existing punch item
  const isAlreadyPromoted = (entry) =>
    promotedIds.has(entry.id) ||
    punchItems.some(
      (p) => p.description?.trim().toLowerCase() === entry.content?.trim().toLowerCase()
    );

  const handlePromote = (entry) => {
    if (isAlreadyPromoted(entry) || promotingId) return;
    setPromotingId(entry.id);
    promoteMutation.mutate(entry);
  };

  // Convert HH:MM string to sortable integer (e.g. "07:45" → 745)
  const timeToInt = (ts) => {
    if (!ts) return 0;
    const [h, m] = ts.split(':').map(Number);
    return (h || 0) * 100 + (m || 0);
  };

  // Entries sorted chronologically for display
  const sortedEntries = [...entries].sort((a, b) => timeToInt(a.time_stamp) - timeToInt(b.time_stamp));

  // Regex: optional leading time in HH:MM or H:MM format, followed by whitespace
  const TIME_PREFIX_RE = /^(\d{1,2}:\d{2})\s+/;

  const handleAdd = () => {
    if (!newEntry.trim()) return;

    let content = newEntry.trim();
    let timeStamp;

    const match = content.match(TIME_PREFIX_RE);
    if (match) {
      // User typed a time prefix — extract and normalize it, strip from content
      const raw = match[1];
      const [h, m] = raw.split(':');
      timeStamp = `${String(h).padStart(2, '0')}:${m}`;
      content = content.slice(match[0].length).trim();
      if (!content) return; // don't add an entry with no text
    } else {
      // No time prefix — use current real time
      timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    createMutation.mutate({ daily_log_id: logId, content, time_stamp: timeStamp, sort_order: entries.length + 1 });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.content);
    setEditTime(entry.time_stamp);
  };

  const handleSave = async (id) => {
    const normalized = editTime.trim().replace(/^(\d):/, '0$1:');
    const newTime = normalized || editTime;

    setSaving(true);
    try {
      // Build the updated list with the edited entry's new time, then sort it
      // to derive the correct sort_order for every entry in chronological order.
      const updated = entries.map((e) =>
        e.id === id ? { ...e, time_stamp: newTime, content: editText } : e
      );
      const reordered = [...updated].sort((a, b) => timeToInt(a.time_stamp) - timeToInt(b.time_stamp));

      // Persist the edited entry first, then write sort_order updates for any
      // entry whose position changed. Fire them in parallel after the primary save.
      await fieldlog.entities.LogEntry.update(id, { content: editText, time_stamp: newTime });

      const sortUpdates = reordered
        .map((e, idx) => ({ id: e.id, sort_order: idx + 1 }))
        .filter(({ id: eid, sort_order }) => {
          const original = entries.find((e) => e.id === eid);
          return original && original.sort_order !== sort_order;
        });

      await Promise.all(
        sortUpdates.map(({ id: eid, sort_order }) =>
          fieldlog.entities.LogEntry.update(eid, { sort_order })
        )
      );

      queryClient.invalidateQueries({ queryKey: ['logEntries', logId] });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  // AI cleanup on compose box — cleans the typed text before adding
  const handleCleanupNew = async () => {
    if (!newEntry.trim()) return;
    setCleaningUp(true);
    try {
      const cleaned = await cleanupEntry(newEntry);
      setNewEntry(cleaned);
    } catch (e) {
      // silently fail — leave original text intact
    } finally {
      setCleaningUp(false);
    }
  };

  // AI cleanup on existing entry while in edit mode
  const handleCleanupEdit = async (id) => {
    if (!editText.trim()) return;
    setCleaningEditId(id);
    try {
      const cleaned = await cleanupEntry(editText);
      setEditText(cleaned);
    } catch (e) {
      // silently fail
    } finally {
      setCleaningEditId(null);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Feed</h3>

      {/* Compose box */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-2">
        <Textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an entry... or start with HH:MM to set the time (Enter to add)"
          className="bg-secondary border-border min-h-[48px] max-h-32 resize-none"
          rows={1}
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCleanupNew}
            disabled={!newEntry.trim() || cleaningUp}
            className="h-8 text-xs text-primary hover:bg-primary/5 px-2"
            title="Polish this entry with AI"
          >
            {cleaningUp
              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cleaning...</>
              : <><Sparkles className="h-3 w-3 mr-1" /> Clean up with AI</>}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!newEntry.trim() || createMutation.isPending}
            className="bg-primary text-primary-foreground h-8 px-4 text-xs"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Entry list */}
      <div className="space-y-2">
        {sortedEntries.map((entry) => (
          <div key={entry.id} className="bg-card border border-border rounded-lg p-3">
            {editingId === entry.id ? (
              <div className="space-y-2">
                {/* Time edit */}
                <div className="flex gap-2 items-center">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="bg-secondary border-border h-8 w-24 font-mono text-xs text-center"
                    placeholder="HH:MM"
                    maxLength={5}
                  />
                  <span className="text-xs text-muted-foreground">24h format</span>
                </div>
                {/* Text edit */}
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="bg-secondary border-border resize-none min-h-[60px]"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  {/* AI cleanup in edit mode */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCleanupEdit(entry.id)}
                    disabled={!editText.trim() || cleaningEditId === entry.id}
                    className="h-8 text-xs text-primary hover:bg-primary/5 px-2"
                  >
                    {cleaningEditId === entry.id
                      ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cleaning...</>
                      : <><Sparkles className="h-3 w-3 mr-1" /> Clean up with AI</>}
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(entry.id)} disabled={saving} className="bg-primary text-primary-foreground h-8">
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-xs font-mono text-primary font-medium">{entry.time_stamp}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {/* Promote to Punch List */}
                  {isAlreadyPromoted(entry) ? (
                    <span
                      title="On Punch List"
                      className="p-1.5 text-amber-400"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePromote(entry)}
                      disabled={promotingId === entry.id}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                      title="Promote to Punch List"
                    >
                      {promotingId === entry.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ArrowUpRight className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button onClick={() => startEdit(entry)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Edit entry">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(entry.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Delete entry">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No entries yet. Start typing above.</p>
      )}
    </div>
  );
}
