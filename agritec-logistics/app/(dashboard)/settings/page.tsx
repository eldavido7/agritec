'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { DollarSign, MapPin, Save, Search, User, X } from 'lucide-react';
import { nigerianStates } from '@/lib/data/nigerian-states';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';
import type { CoverageType } from '@/lib/types';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  contactPersonName: string;
  businessAddress: string;
  city: string;
  state: string;
  lga: string;
  area: string;
  description: string;
};

type PricingFormState = {
  abujaMinimumFee: string;
  abujaAdditionalUnitFee: string;
  outsideMinimumFee: string;
  outsideAdditionalUnitFee: string;
  weightUnitSizeKg: string;
  volumetricDivisor: string;
  weeklyAutoPayoutDay: string;
};

export default function SettingsPage() {
  const user = useLogisticsAuthStore((state) => state.user);
  const profile = useLogisticsStore((state) => state.profile);
  const fetchProfile = useLogisticsStore((state) => state.fetchProfile);
  const updateProfile = useLogisticsStore((state) => state.updateProfile);
  const isLoadingProfile = useLogisticsStore((state) => state.isLoadingProfile);
  const isUpdatingProfile = useLogisticsStore((state) => state.isUpdatingProfile);
  const [activeTab, setActiveTab] = useState('profile');
  const [savedMessage, setSavedMessage] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    contactPersonName: '',
    businessAddress: '',
    city: '',
    state: '',
    lga: '',
    area: '',
    description: '',
  });
  const [pricingForm, setPricingForm] = useState<PricingFormState>({
    abujaMinimumFee: '2500',
    abujaAdditionalUnitFee: '2500',
    outsideMinimumFee: '5000',
    outsideAdditionalUnitFee: '5000',
    weightUnitSizeKg: '10',
    volumetricDivisor: '5000',
    weeklyAutoPayoutDay: '',
  });
  const [coverageType, setCoverageType] = useState<CoverageType>('REGIONAL');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedLGAsByState, setSelectedLGAsByState] = useState<Record<string, string[]>>({});
  const [stateSearch, setStateSearch] = useState('');
  const [lgaSearch, setLgaSearch] = useState('');

  useEffect(() => {
    void fetchProfile({ force: true }).catch(() => undefined);
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.logisticsProfile || !profile) {
      return;
    }

    setProfileForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || user.logisticsProfile.phone || '',
      companyName: user.logisticsProfile.companyName || '',
      contactPersonName: user.logisticsProfile.contactPersonName || '',
      businessAddress: user.logisticsProfile.businessAddress || '',
      city: user.logisticsProfile.city || '',
      state: user.logisticsProfile.state || '',
      lga: user.logisticsProfile.lga || '',
      area: user.logisticsProfile.area || '',
      description: user.logisticsProfile.description || '',
    });

    setPricingForm({
      abujaMinimumFee: String(profile.pricingSettings?.abujaMinimumFee ?? 2500),
      abujaAdditionalUnitFee: String(profile.pricingSettings?.abujaAdditionalUnitFee ?? 2500),
      outsideMinimumFee: String(profile.pricingSettings?.outsideMinimumFee ?? 5000),
      outsideAdditionalUnitFee: String(profile.pricingSettings?.outsideAdditionalUnitFee ?? 5000),
      weightUnitSizeKg: String(profile.pricingSettings?.weightUnitSizeKg ?? 10),
      volumetricDivisor: String(profile.pricingSettings?.volumetricDivisor ?? 5000),
      weeklyAutoPayoutDay:
        profile.pricingSettings?.weeklyAutoPayoutDay == null
          ? ''
          : String(profile.pricingSettings.weeklyAutoPayoutDay),
    });

    setCoverageType(profile.coverageDraft.coverageType);
    setSelectedStates(profile.coverageDraft.stateSelections);

    const nextSelectedLGAsByState: Record<string, string[]> = {};
    for (const selection of profile.coverageDraft.lgaSelections) {
      nextSelectedLGAsByState[selection.state] = [
        ...(nextSelectedLGAsByState[selection.state] || []),
        selection.lga,
      ];
    }
    setSelectedLGAsByState(nextSelectedLGAsByState);
  }, [profile, user]);

  const filteredStates = useMemo(
    () =>
      nigerianStates.filter((state) =>
        state.name.toLowerCase().includes(stateSearch.toLowerCase())
      ),
    [stateSearch]
  );

  const activeStateData = useMemo(
    () => nigerianStates.find((state) => state.name === selectedState) ?? null,
    [selectedState]
  );

  const filteredLGAs = useMemo(() => {
    if (!activeStateData) return [];
    return activeStateData.lgas.filter((lga) =>
      lga.toLowerCase().includes(lgaSearch.toLowerCase())
    );
  }, [activeStateData, lgaSearch]);

  const handleStateToggle = (stateName: string) => {
    setSelectedStates((current) =>
      current.includes(stateName)
        ? current.filter((state) => state !== stateName)
        : [...current, stateName].sort()
    );
  };

  const handleLGAToggle = (stateName: string, lga: string) => {
    setSelectedLGAsByState((current) => {
      const existing = current[stateName] || [];
      const next = existing.includes(lga)
        ? existing.filter((value) => value !== lga)
        : [...existing, lga].sort();

      return {
        ...current,
        [stateName]: next,
      };
    });
  };

  const handleSave = async () => {
    setSavedMessage('');

    try {
      const coverageAreas =
        coverageType === 'NATIONWIDE'
          ? []
          : [
              ...selectedStates.map((state) => ({
                selectionType: 'STATE',
                state,
              })),
              ...Object.entries(selectedLGAsByState).flatMap(([state, lgas]) =>
                lgas.map((lga) => ({
                  selectionType: 'LGA',
                  state,
                  lga,
                }))
              ),
            ];

      await updateProfile({
        ...profileForm,
        phone: profileForm.phone || null,
        contactPersonName: profileForm.contactPersonName || null,
        businessAddress: profileForm.businessAddress || null,
        city: profileForm.city || null,
        state: profileForm.state || null,
        lga: profileForm.lga || null,
        area: profileForm.area || null,
        description: profileForm.description || null,
        pricingSettings: {
          abujaMinimumFee: Number(pricingForm.abujaMinimumFee || 0),
          abujaAdditionalUnitFee: Number(pricingForm.abujaAdditionalUnitFee || 0),
          outsideMinimumFee: Number(pricingForm.outsideMinimumFee || 0),
          outsideAdditionalUnitFee: Number(pricingForm.outsideAdditionalUnitFee || 0),
          weightUnitSizeKg: Number(pricingForm.weightUnitSizeKg || 10),
          volumetricDivisor: Number(pricingForm.volumetricDivisor || 5000),
          weeklyAutoPayoutDay:
            pricingForm.weeklyAutoPayoutDay === ''
              ? null
              : Number(pricingForm.weeklyAutoPayoutDay),
        },
        coverage: {
          coverageType,
          areas: coverageAreas,
        },
      });

      setSavedMessage('Settings saved successfully.');
    } catch (saveError) {
      setSavedMessage(
        saveError instanceof Error ? saveError.message : 'Failed to save settings'
      );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your logistics company profile, pricing, and delivery coverage
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="coverage" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Coverage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Owner Full Name">
                  <Input value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} />
                </Field>
                <Field label="Company Name">
                  <Input value={profileForm.companyName} onChange={(event) => setProfileForm((current) => ({ ...current, companyName: event.target.value }))} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Email">
                  <Input type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
                </Field>
                <Field label="Phone">
                  <Input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Contact Person">
                  <Input value={profileForm.contactPersonName} onChange={(event) => setProfileForm((current) => ({ ...current, contactPersonName: event.target.value }))} />
                </Field>
                <Field label="City">
                  <Input value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} />
                </Field>
              </div>

              <Field label="Business Address">
                <Input value={profileForm.businessAddress} onChange={(event) => setProfileForm((current) => ({ ...current, businessAddress: event.target.value }))} />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="State">
                  <Input value={profileForm.state} onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))} />
                </Field>
                <Field label="LGA">
                  <Input value={profileForm.lga} onChange={(event) => setProfileForm((current) => ({ ...current, lga: event.target.value }))} />
                </Field>
                <Field label="Area">
                  <Input value={profileForm.area} onChange={(event) => setProfileForm((current) => ({ ...current, area: event.target.value }))} />
                </Field>
              </div>

              <Field label="Company Description">
                <Input value={profileForm.description} onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))} />
              </Field>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Abuja Minimum Fee">
                  <Input type="number" value={pricingForm.abujaMinimumFee} onChange={(event) => setPricingForm((current) => ({ ...current, abujaMinimumFee: event.target.value }))} />
                </Field>
                <Field label="Abuja Additional Unit Fee">
                  <Input type="number" value={pricingForm.abujaAdditionalUnitFee} onChange={(event) => setPricingForm((current) => ({ ...current, abujaAdditionalUnitFee: event.target.value }))} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Outside Abuja Minimum Fee">
                  <Input type="number" value={pricingForm.outsideMinimumFee} onChange={(event) => setPricingForm((current) => ({ ...current, outsideMinimumFee: event.target.value }))} />
                </Field>
                <Field label="Outside Abuja Additional Unit Fee">
                  <Input type="number" value={pricingForm.outsideAdditionalUnitFee} onChange={(event) => setPricingForm((current) => ({ ...current, outsideAdditionalUnitFee: event.target.value }))} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Weight Unit Size (kg)">
                  <Input type="number" step="0.001" value={pricingForm.weightUnitSizeKg} onChange={(event) => setPricingForm((current) => ({ ...current, weightUnitSizeKg: event.target.value }))} />
                </Field>
                <Field label="Volumetric Divisor">
                  <Input type="number" value={pricingForm.volumetricDivisor} onChange={(event) => setPricingForm((current) => ({ ...current, volumetricDivisor: event.target.value }))} />
                </Field>
                <Field label="Weekly Auto Payout Day">
                  <Select value={pricingForm.weeklyAutoPayoutDay || 'NONE'} onValueChange={(value) => setPricingForm((current) => ({ ...current, weeklyAutoPayoutDay: value == null || value === 'NONE' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not set</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="coverage" className="space-y-4">
              <Field label="Coverage Type">
                <Select value={coverageType} onValueChange={(value) => setCoverageType((value ?? 'REGIONAL') as CoverageType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGIONAL">Regional</SelectItem>
                    <SelectItem value="NATIONWIDE">Nationwide</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {coverageType === 'NATIONWIDE' ? (
                <Card className="border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                  Nationwide coverage enabled. Your company will be eligible for all supported delivery destinations.
                </Card>
              ) : (
                <Card className="space-y-4 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Supported States</label>
                    <div className="relative mb-3">
                      <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search states..."
                        value={stateSearch}
                        onChange={(event) => setStateSearch(event.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                      {filteredStates.map((state) => (
                        <div key={state.name} className="flex items-center gap-2">
                          <Checkbox
                            id={`state-${state.name}`}
                            checked={selectedStates.includes(state.name)}
                            onCheckedChange={() => handleStateToggle(state.name)}
                          />
                          <label htmlFor={`state-${state.name}`} className="flex-1 cursor-pointer text-sm text-foreground">
                            {state.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedStates.length > 0 ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedStates.map((state) => (
                          <div key={state} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                            {state}
                            <button type="button" onClick={() => handleStateToggle(state)}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <Field label="Specific LGAs or cities within selected states">
                        <Select value={selectedState || 'NONE'} onValueChange={(value) => setSelectedState(value == null || value === 'NONE' ? '' : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose state for LGA selection" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Choose state</SelectItem>
                            {selectedStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {selectedState ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search LGAs..."
                              value={lgaSearch}
                              onChange={(event) => setLgaSearch(event.target.value)}
                              className="pl-8"
                            />
                          </div>

                          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                            {filteredLGAs.map((lga) => (
                              <div key={lga} className="flex items-center gap-2">
                                <Checkbox
                                  id={`lga-${selectedState}-${lga}`}
                                  checked={(selectedLGAsByState[selectedState] || []).includes(lga)}
                                  onCheckedChange={() => handleLGAToggle(selectedState, lga)}
                                />
                                <label
                                  htmlFor={`lga-${selectedState}-${lga}`}
                                  className="flex-1 cursor-pointer text-sm text-foreground"
                                >
                                  {lga}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {savedMessage ? (
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
              {savedMessage}
            </div>
          ) : null}

          <div className="mt-6 border-t border-border pt-4">
            <Button onClick={() => void handleSave()} disabled={isLoadingProfile || isUpdatingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
