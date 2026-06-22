'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Save, User, DollarSign, MapPin, Lock, Search, X } from 'lucide-react';
import { nigerianStates } from '@/lib/data/nigerian-states';

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [coverageType, setCoverageType] = useState('regional');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedLGAs, setSelectedLGAs] = useState<string[]>([]);
  const [lgaSearch, setLgaSearch] = useState('');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleStateToggle = (stateName: string) => {
    setSelectedStates((prev) =>
      prev.includes(stateName) ? prev.filter((s) => s !== stateName) : [...prev, stateName]
    );
  };

  const handleLGAToggle = (lga: string) => {
    setSelectedLGAs((prev) =>
      prev.includes(lga) ? prev.filter((l) => l !== lga) : [...prev, lga]
    );
  };

  const filteredStates = nigerianStates.filter((state) =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const currentState = selectedState ? nigerianStates.find((s) => s.name === selectedState) : null;
  const filteredLGAs = currentState
    ? currentState.lgas.filter((lga) => lga.toLowerCase().includes(lgaSearch.toLowerCase()))
    : [];

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
        <p className="text-muted-foreground mt-2">Manage your account and business settings</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="coverage" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Coverage</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Company Name</label>
                  <Input placeholder="Your Company" defaultValue="AgriTec Logistics" className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Contact Person</label>
                  <Input placeholder="John Doe" defaultValue="John Doe" className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    defaultValue="john@agritec.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <Input placeholder="+234-80-0000-0000" defaultValue="+234-801-234-5678" className="mt-2" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <Textarea
                  placeholder="Business address"
                  defaultValue="123 Business Street, Lagos, Nigeria"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">CAC Number</label>
                  <Input placeholder="12345678" defaultValue="12345678" className="mt-2" />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Set your pricing tiers based on weight. Prices are calculated as: (base price) + (weight × price per kg)
                </p>
              </div>

              {[
                { name: 'Light', base: 2000, perKg: 50, min: 0, max: 20 },
                { name: 'Standard', base: 3500, perKg: 40, min: 20, max: 50 },
                { name: 'Heavy', base: 5000, perKg: 30, min: 50, max: 100 },
              ].map((tier, i) => (
                <Card key={i} className="p-4">
                  <h4 className="font-semibold text-foreground mb-4">{tier.name} Tier</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Weight Range</label>
                      <Input
                        placeholder="Min"
                        defaultValue={`${tier.min}-${tier.max} kg`}
                        disabled
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Base Price (₦)</label>
                      <Input placeholder="0" defaultValue={tier.base.toString()} className="mt-2" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Price per kg (₦)</label>
                      <Input placeholder="0" defaultValue={tier.perKg.toString()} className="mt-2" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <div className="mt-2">
                        <Checkbox defaultChecked />
                        <span className="ml-2 text-sm text-muted-foreground">Active</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* Coverage Tab */}
            <TabsContent value="coverage" className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure your delivery coverage type and service areas
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Coverage Type</label>
                <Select value={coverageType} onValueChange={setCoverageType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="nationwide">Nationwide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {coverageType === 'regional' && (
                <Card className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Select States
                    </label>
                    <div className="flex items-center gap-2 mb-3 relative">
                      <Search className="w-4 h-4 absolute left-2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search states..."
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>

                    <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {filteredStates.length > 0 ? (
                        filteredStates.map((state) => (
                          <div key={state.name} className="flex items-center gap-2">
                            <Checkbox
                              id={`state-${state.name}`}
                              checked={selectedStates.includes(state.name)}
                              onCheckedChange={() => handleStateToggle(state.name)}
                            />
                            <label
                              htmlFor={`state-${state.name}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {state.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No states found</p>
                      )}
                    </div>

                    {selectedStates.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Selected states ({selectedStates.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedStates.map((state) => (
                            <div key={state} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              {state}
                              <button
                                onClick={() => handleStateToggle(state)}
                                className="hover:text-primary/80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedStates.length > 0 && (
                    <div className="pt-4 border-t border-border space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Select LGAs/Cities (Optional - leave empty for all)
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Choose a state to select specific LGAs/cities within it:
                        </p>

                        <Select value={selectedState || ''} onValueChange={setSelectedState}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a state..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedState && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 relative">
                            <Search className="w-4 h-4 absolute left-2 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search LGAs/cities..."
                              value={lgaSearch}
                              onChange={(e) => setLgaSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>

                          <div className="border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {filteredLGAs.length > 0 ? (
                              filteredLGAs.map((lga) => (
                                <div key={lga} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`lga-${lga}`}
                                    checked={selectedLGAs.includes(lga)}
                                    onCheckedChange={() => handleLGAToggle(lga)}
                                  />
                                  <label
                                    htmlFor={`lga-${lga}`}
                                    className="text-sm text-foreground cursor-pointer flex-1"
                                  >
                                    {lga}
                                  </label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No LGAs found</p>
                            )}
                          </div>

                          {selectedLGAs.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Selected LGAs in {selectedState} ({selectedLGAs.length}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedLGAs.map((lga) => (
                                  <div key={lga} className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    {lga}
                                    <button
                                      onClick={() => handleLGAToggle(lga)}
                                      className="hover:text-secondary/80"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {coverageType === 'nationwide' && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-sm text-foreground">
                    Nationwide coverage enabled. You can deliver to all states and LGAs in Nigeria.
                  </p>
                </Card>
              )}

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <Input type="password" placeholder="••••••••" className="mt-2" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">New Password</label>
                <Input type="password" placeholder="••••••••" className="mt-2" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                <Input type="password" placeholder="••••••••" className="mt-2" />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Password must be at least 8 characters and contain a mix of letters, numbers, and symbols.
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" />
                  {saved ? 'Saved!' : 'Update Password'}
                </Button>
              </div>

              <div className="pt-6 border-t border-border">
                <h4 className="font-semibold text-foreground mb-4">Danger Zone</h4>
                <Button variant="destructive">
                  Delete Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </motion.div>
  );
}
