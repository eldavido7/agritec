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
import { DollarSign, MapPin, Save, Search, User } from 'lucide-react';
import { nigeriaLocations } from '@/lib/data/nigeria-locations';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { useLogisticsAuthStore } from '@/lib/store/logistics-auth-store';
import { Spinner } from '@/components/ui/spinner';
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
  minimumFee: string;
  additionalUnitFee: string;
  weightUnitSizeKg: string;
  volumetricDivisor: string;
  isActive: boolean;
};

type StatePricingForm = Record<string, PricingFormState>;

const defaultPricingForm = (): PricingFormState => ({
  minimumFee: '2500',
  additionalUnitFee: '2500',
  weightUnitSizeKg: '10',
  volumetricDivisor: '5000',
  isActive: true,
});

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
  const [coverageType, setCoverageType] = useState<CoverageType>('REGIONAL');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [nationwidePricing, setNationwidePricing] = useState<PricingFormState>(
    defaultPricingForm()
  );
  const [statePricing, setStatePricing] = useState<StatePricingForm>({});
  const [stateSearch, setStateSearch] = useState('');

  useEffect(() => {
    void fetchProfile().catch(() => undefined);
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

    setCoverageType(profile.coverageType);
    setSelectedStates(profile.coveredStates);
    setNationwidePricing(
      profile.nationwidePricing
        ? {
            minimumFee: String(profile.nationwidePricing.minimumFee),
            additionalUnitFee: String(profile.nationwidePricing.additionalUnitFee),
            weightUnitSizeKg: String(profile.nationwidePricing.weightUnitSizeKg),
            volumetricDivisor: String(profile.nationwidePricing.volumetricDivisor),
            isActive: profile.nationwidePricing.isActive,
          }
        : defaultPricingForm()
    );

    const nextStatePricing: StatePricingForm = {};
    for (const stateName of profile.coveredStates) {
      const existingRow = profile.statePricing.find((entry) => entry.state === stateName);
      nextStatePricing[stateName] = existingRow
        ? {
            minimumFee: String(existingRow.minimumFee),
            additionalUnitFee: String(existingRow.additionalUnitFee),
            weightUnitSizeKg: String(existingRow.weightUnitSizeKg),
            volumetricDivisor: String(existingRow.volumetricDivisor),
            isActive: existingRow.isActive,
          }
        : defaultPricingForm();
    }
    setStatePricing(nextStatePricing);
  }, [profile, user]);

  const filteredStates = useMemo(
    () =>
      nigeriaLocations.filter((state) =>
        state.name.toLowerCase().includes(stateSearch.toLowerCase())
      ),
    [stateSearch]
  );

  const selectedStateLocations = useMemo(
    () =>
      selectedStates
        .map((stateName) => nigeriaLocations.find((entry) => entry.name === stateName))
        .filter((entry): entry is (typeof nigeriaLocations)[number] => Boolean(entry)),
    [selectedStates]
  );

  const handleStateToggle = (stateName: string) => {
    setSelectedStates((current) => {
      const next = current.includes(stateName)
        ? current.filter((state) => state !== stateName)
        : [...current, stateName].sort();

      setStatePricing((existing) => {
        const updated: StatePricingForm = {};
        for (const state of next) {
          updated[state] = existing[state] || defaultPricingForm();
        }
        return updated;
      });

      return next;
    });
  };

  const updateStatePricing = (
    stateName: string,
    field: keyof PricingFormState,
    value: string | boolean
  ) => {
    setStatePricing((current) => ({
      ...current,
      [stateName]: {
        ...(current[stateName] || defaultPricingForm()),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSavedMessage('');

    try {
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
        coverage: {
          coverageType,
          states: coverageType === 'REGIONAL' ? selectedStates : [],
        },
        pricing: {
          nationwidePricing:
            coverageType === 'NATIONWIDE'
              ? {
                  minimumFee: Number(nationwidePricing.minimumFee || 0),
                  additionalUnitFee: Number(nationwidePricing.additionalUnitFee || 0),
                  weightUnitSizeKg: Number(nationwidePricing.weightUnitSizeKg || 10),
                  volumetricDivisor: Number(nationwidePricing.volumetricDivisor || 5000),
                }
              : null,
          statePricing:
            coverageType === 'REGIONAL'
              ? selectedStates.map((state) => ({
                  state,
                  minimumFee: Number(statePricing[state]?.minimumFee || 0),
                  additionalUnitFee: Number(statePricing[state]?.additionalUnitFee || 0),
                  weightUnitSizeKg: Number(statePricing[state]?.weightUnitSizeKg || 10),
                  volumetricDivisor: Number(statePricing[state]?.volumetricDivisor || 5000),
                  isActive: statePricing[state]?.isActive ?? true,
                }))
              : [],
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

  if (isLoadingProfile && !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your logistics company profile, coverage, and coverage-based pricing
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 dark:data-active:border-primary/50 dark:data-active:bg-primary/20 dark:data-active:text-white"
              >
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="flex items-center gap-2 dark:data-active:border-primary/50 dark:data-active:bg-primary/20 dark:data-active:text-white"
              >
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger
                value="coverage"
                className="flex items-center gap-2 dark:data-active:border-primary/50 dark:data-active:bg-primary/20 dark:data-active:text-white"
              >
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
                <Card className="space-y-4 p-4">
                  <p className="text-sm text-muted-foreground">
                    One nationwide rate applies across all supported destinations for this company.
                  </p>
                  <PricingFields
                    value={nationwidePricing}
                    onChange={(field, value) =>
                      setNationwidePricing((current) => ({ ...current, [field]: value }))
                    }
                    showActive={false}
                  />
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card className="border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Configure one pricing row per selected state. Each selected state covers all LGAs and major areas under that state for MVP.
                  </Card>

                  {selectedStates.length === 0 ? (
                    <Card className="border-dashed p-6 text-sm text-muted-foreground">
                      Select covered states in the Coverage tab before configuring regional pricing.
                    </Card>
                  ) : (
                    selectedStates.map((state) => {
                      const stateMeta = nigeriaLocations.find((entry) => entry.name === state);
                      const pricingRow = statePricing[state] || defaultPricingForm();

                      return (
                        <Card key={state} className="space-y-4 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">{state}</h3>
                              <p className="text-sm text-muted-foreground">
                                Covers {stateMeta?.lgas.length || 0} LGAs
                                {stateMeta?.majorCities.length
                                  ? ` • Major areas: ${stateMeta.majorCities.slice(0, 4).join(', ')}`
                                  : ''}
                              </p>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-foreground">
                              <Checkbox
                                checked={pricingRow.isActive}
                                onCheckedChange={(checked) =>
                                  updateStatePricing(state, 'isActive', Boolean(checked))
                                }
                              />
                              Active
                            </label>
                          </div>

                          <PricingFields
                            value={pricingRow}
                            onChange={(field, value) => updateStatePricing(state, field, value)}
                          />
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
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
                  Nationwide coverage enabled. Your company will be eligible across all supported buyer delivery states when verified and active.
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card className="border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                    For MVP, select covered states only. Every LGA and major area in a selected state is covered by default.
                  </Card>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search states..."
                      value={stateSearch}
                      onChange={(event) => setStateSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredStates.map((state) => (
                      <button
                        key={state.name}
                        type="button"
                        onClick={() => handleStateToggle(state.name)}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          selectedStates.includes(state.name)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{state.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {state.lgas.length} LGAs
                            </p>
                            {state.majorCities.length > 0 ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {state.majorCities.slice(0, 4).join(', ')}
                              </p>
                            ) : null}
                          </div>
                          <Checkbox checked={selectedStates.includes(state.name)} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedStateLocations.length > 0 ? (
                    <Card className="p-4">
                      <p className="mb-3 text-sm font-medium text-foreground">
                        Covered states
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStateLocations.map((state) => (
                          <span
                            key={state.name}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                          >
                            {state.name}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </div>
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

function PricingFields({
  value,
  onChange,
  showActive = true,
}: {
  value: PricingFormState;
  onChange: (field: keyof PricingFormState, value: string | boolean) => void;
  showActive?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Minimum Fee">
          <Input type="number" value={value.minimumFee} onChange={(event) => onChange('minimumFee', event.target.value)} />
        </Field>
        <Field label="Additional Unit Fee">
          <Input type="number" value={value.additionalUnitFee} onChange={(event) => onChange('additionalUnitFee', event.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Weight Unit Size (kg)">
          <Input type="number" step="0.001" value={value.weightUnitSizeKg} onChange={(event) => onChange('weightUnitSizeKg', event.target.value)} />
        </Field>
        <Field label="Volumetric Divisor">
          <Input type="number" value={value.volumetricDivisor} onChange={(event) => onChange('volumetricDivisor', event.target.value)} />
        </Field>
      </div>

      {showActive ? (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={value.isActive} onCheckedChange={(checked) => onChange('isActive', Boolean(checked))} />
          Pricing row is active
        </label>
      ) : null}
    </div>
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
