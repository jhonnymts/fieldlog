import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function PunchFormDialog({ open, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({ description: '', owner: '', target_date: '' });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit({ ...form, status: 'Open' }); setForm({ description: '', owner: '', target_date: '' }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md"><DialogHeader><DialogTitle className="text-foreground">Add Punch Item</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Description *</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border mt-1 min-h-[80px] resize-none" placeholder="Describe the issue..." /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Owner</Label><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="Assign to..." /></div><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Target Date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="bg-secondary border-border mt-1 h-12" /></div></div>
          <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">{isLoading ? 'Adding...' : 'Add Item'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}