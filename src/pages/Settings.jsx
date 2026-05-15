import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

export const SETTINGS_KEY = 'fieldlog_settings';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function Settings() {
  const [engineerName, setEngineerName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const s = getSettings();
    setEngineerName(s.engineerName || '');
    setCompanyName(s.companyName || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ engineerName, companyName }));
    toast.success('Settings saved');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Engineer Name</Label>
          <p className="text-xs text-muted-foreground mb-2">Your name as it appears in PDF report headers</p>
          <Input
            value={engineerName}
            onChange={(e) => setEngineerName(e.target.value)}
            className="bg-secondary border-border h-12"
            placeholder="e.g. Jhonny Doe"
          />
        </div>

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Company Name</Label>
          <p className="text-xs text-muted-foreground mb-2">Shown in PDF report headers as &quot;Prepared by&quot;</p>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="bg-secondary border-border h-12"
            placeholder="e.g. Burrow Global LLC"
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Settings are saved locally in this browser only.
      </p>
    </div>
  );
}
