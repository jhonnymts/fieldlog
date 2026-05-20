import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectFormDialog({ open, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({ project_name: '', client_name: '', location: '', project_number: '', activity_type: 'T&C', start_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() });
  const reset = () => setForm({ project_name: '', client_name: '', location: '', project_number: '', activity_type: 'T&C', start_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); reset(); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md"><DialogHeader><DialogTitle className="text-foreground">New Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Project Name *</Label><Input required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. Tank Farm Automation" /></div>
          <div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Client Name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. ACME Corp" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. Houston, TX" /></div><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Project #</Label><Input value={form.project_number} onChange={(e) => setForm({ ...form, project_number: e.target.value })} className="bg-secondary border-border mt-1 h-12" placeholder="e.g. P-2024-001" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Activity Type</Label><Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}><SelectTrigger className="bg-secondary border-border mt-1 h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FAT">FAT</SelectItem><SelectItem value="SAT">SAT</SelectItem><SelectItem value="T&C">T&C</SelectItem><SelectItem value="Commissioning">Commissioning</SelectItem></SelectContent></Select></div><div><Label className="text-muted-foreground text-xs uppercase tracking-wider">Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-secondary border-border mt-1 h-12" /></div></div>
          <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">{isLoading ? 'Creating...' : 'Create Project'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}