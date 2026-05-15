import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssetFormDialog({ open, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({ asset_id: '', asset_name: '', asset_type: 'Other', status: 'In Progress', notes: '' });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); setForm({ asset_id: '', asset_name: '', asset_type: 'Other', status: 'In Progress', notes: '' }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md"><DialogHeader><DialogTitle className="text-foreground">Add Asset</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Asset ID *</Label><Input required value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. 3725-1" /></div><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Asset Type</Label><Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}><SelectTrigger className="bg-secondary border-border mt-1 h-12"><SelectValue /></SelectTrigger><SelectContent>{['Tank', 'Valve', 'Drive', 'Panel', 'Instrument', 'Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div></div>
          <div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Asset Name *</Label><Input required value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. Product Tank #1" /></div>
          <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">{isLoading ? 'Adding...' : 'Add Asset'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}