import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Settings as SettingsIcon, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const SETTINGS_KEY = 'fieldlog_settings';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const [engineerName, setEngineerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');

  useEffect(() => {
    const s = getSettings();
    setEngineerName(s.engineerName || '');
    setCompanyName(s.companyName || '');
    setLogoDataUrl(s.logoDataUrl || '');
  }, []);

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 750 * 1024) {
      toast.error('Logo image is too large. Use an image under 750 KB.');
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setLogoDataUrl(dataUrl);
      toast.success('Logo loaded. Save settings to keep it.');
    } catch {
      toast.error('Unable to read the selected logo image');
    }
  };

  const handleRemoveLogo = () => {
    setLogoDataUrl('');
    toast.success('Logo removed. Save settings to keep the change.');
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ engineerName, companyName, logoDataUrl }));
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

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Company Logo</Label>
          <p className="text-xs text-muted-foreground mb-2">Optional image shown in the PDF report header</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="flex items-center justify-center gap-2 h-12 px-4 rounded-lg border border-border bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
              <ImagePlus className="h-4 w-4" />
              Choose Logo
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>

            {logoDataUrl && (
              <div className="flex items-center gap-3">
                <div className="h-14 w-28 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden p-2">
                  <img src={logoDataUrl} alt="Company logo preview" className="max-h-full max-w-full object-contain" />
                </div>
                <Button type="button" variant="ghost" onClick={handleRemoveLogo} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
          </div>
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
