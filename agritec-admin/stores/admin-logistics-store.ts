"use client";

import { create } from "zustand";
import { adminApiRequest } from "@/lib/admin-api";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

type LogisticsPricingSettings = {
  id: string;
  abujaMinimumFee: number;
  abujaAdditionalUnitFee: number;
  outsideMinimumFee: number;
  outsideAdditionalUnitFee: number;
  weightUnitSizeKg: number | null;
  volumetricDivisor: number;
  weeklyAutoPayoutDay: number | null;
};

type LogisticsCoverageArea = {
  id: string;
  coverageType: string;
  selectionType: string | null;
  state: string | null;
  lga: string | null;
  city: string | null;
  area: string | null;
  isActive: boolean;
};

export type AdminLogisticsRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  companyName: string;
  description: string | null;
  contactPersonName: string | null;
  businessAddress: string | null;
  city: string | null;
  state: string | null;
  lga: string | null;
  area: string | null;
  verificationStatus: string;
  isVerified: boolean;
  pricingConfigured: boolean;
  coverageCount: number;
  assignedGroupCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminLogisticsDetailRecord = AdminLogisticsRecord & {
  pricingSettings: LogisticsPricingSettings | null;
  coverageAreas: LogisticsCoverageArea[];
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type AdminLogisticsState = {
  logisticsCompanies: AdminLogisticsRecord[];
  selectedLogistics: AdminLogisticsDetailRecord | null;
  pagination: Pagination;
  isLoading: boolean;
  isDetailLoading: boolean;
  isUpdating: boolean;
  loaded: boolean;
  error: string | null;
  fetchLogisticsCompanies: (options?: { force?: boolean }) => Promise<void>;
  fetchLogisticsDetail: (id: string, options?: { force?: boolean }) => Promise<AdminLogisticsDetailRecord>;
  updateLogisticsStatus: (id: string, action: "verify" | "suspend" | "reactivate") => Promise<void>;
  clearSelectedLogistics: () => void;
};

const defaultPagination: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLogisticsRecord(company: any): AdminLogisticsRecord {
  return {
    id: String(company.id),
    userId: String(company.userId || ""),
    fullName: String(company.fullName || ""),
    email: String(company.email || ""),
    phone: company.phone ? String(company.phone) : null,
    isActive: Boolean(company.isActive),
    companyName: String(company.companyName || ""),
    description: company.description ? String(company.description) : null,
    contactPersonName: company.contactPersonName
      ? String(company.contactPersonName)
      : null,
    businessAddress: company.businessAddress
      ? String(company.businessAddress)
      : null,
    city: company.city ? String(company.city) : null,
    state: company.state ? String(company.state) : null,
    lga: company.lga ? String(company.lga) : null,
    area: company.area ? String(company.area) : null,
    verificationStatus: String(company.verificationStatus || ""),
    isVerified: Boolean(company.isVerified),
    pricingConfigured: Boolean(company.pricingConfigured),
    coverageCount: toNumber(company.coverageCount),
    assignedGroupCount: toNumber(company.assignedGroupCount),
    createdAt: String(company.createdAt || ""),
    updatedAt: String(company.updatedAt || ""),
  };
}

function normalizeLogisticsDetail(company: any): AdminLogisticsDetailRecord {
  return {
    ...normalizeLogisticsRecord(company),
    pricingSettings: company.pricingSettings
      ? {
          id: String(company.pricingSettings.id),
          abujaMinimumFee: toNumber(company.pricingSettings.abujaMinimumFee),
          abujaAdditionalUnitFee: toNumber(company.pricingSettings.abujaAdditionalUnitFee),
          outsideMinimumFee: toNumber(company.pricingSettings.outsideMinimumFee),
          outsideAdditionalUnitFee: toNumber(company.pricingSettings.outsideAdditionalUnitFee),
          weightUnitSizeKg:
            company.pricingSettings.weightUnitSizeKg == null
              ? null
              : toNumber(company.pricingSettings.weightUnitSizeKg),
          volumetricDivisor: toNumber(company.pricingSettings.volumetricDivisor),
          weeklyAutoPayoutDay:
            company.pricingSettings.weeklyAutoPayoutDay == null
              ? null
              : toNumber(company.pricingSettings.weeklyAutoPayoutDay),
        }
      : null,
    coverageAreas: Array.isArray(company.coverageAreas)
      ? company.coverageAreas.map((area: any) => ({
          id: String(area.id),
          coverageType: String(area.coverageType || ""),
          selectionType: area.selectionType ? String(area.selectionType) : null,
          state: area.state ? String(area.state) : null,
          lga: area.lga ? String(area.lga) : null,
          city: area.city ? String(area.city) : null,
          area: area.area ? String(area.area) : null,
          isActive: Boolean(area.isActive),
        }))
      : [],
  };
}

export const useAdminLogisticsStore = create<AdminLogisticsState>((set, get) => ({
  logisticsCompanies: [],
  selectedLogistics: null,
  pagination: defaultPagination,
  isLoading: false,
  isDetailLoading: false,
  isUpdating: false,
  loaded: false,
  error: null,

  fetchLogisticsCompanies: async ({ force = false } = {}) => {
    if (get().loaded && !force) {
      return;
    }

    const token = useAdminAuthStore.getState().token;
    set({ isLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        logisticsCompanies: any[];
        pagination: Pagination;
      }>("/api/admin/logistics?page=1&pageSize=50", {
        method: "GET",
        token,
      });

      set({
        logisticsCompanies: Array.isArray(response.logisticsCompanies)
          ? response.logisticsCompanies.map(normalizeLogisticsRecord)
          : [],
        pagination: response.pagination || defaultPagination,
        isLoading: false,
        loaded: true,
      });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load logistics companies",
      });
      throw error;
    }
  },

  fetchLogisticsDetail: async (id, { force = false } = {}) => {
    if (!force && get().selectedLogistics?.id === id && get().selectedLogistics) {
      return get().selectedLogistics as AdminLogisticsDetailRecord;
    }

    const token = useAdminAuthStore.getState().token;
    set({ isDetailLoading: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        logisticsCompany: any;
      }>(`/api/admin/logistics/${id}`, {
        method: "GET",
        token,
      });

      const logisticsCompany = normalizeLogisticsDetail(response.logisticsCompany);
      set({
        selectedLogistics: logisticsCompany,
        isDetailLoading: false,
      });

      return logisticsCompany;
    } catch (error) {
      set({
        isDetailLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load logistics company details",
      });
      throw error;
    }
  },

  updateLogisticsStatus: async (id, action) => {
    const token = useAdminAuthStore.getState().token;
    set({ isUpdating: true, error: null });

    try {
      const response = await adminApiRequest<{
        success: true;
        logisticsCompany: any;
      }>(`/api/admin/logistics/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ action }),
      });

      const updated = normalizeLogisticsDetail(response.logisticsCompany);

      set((state) => ({
        logisticsCompanies: state.logisticsCompanies.map((company) =>
          company.id === id ? normalizeLogisticsRecord(updated) : company
        ),
        selectedLogistics:
          state.selectedLogistics?.id === id ? updated : state.selectedLogistics,
        isUpdating: false,
      }));
    } catch (error) {
      set({
        isUpdating: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update logistics company",
      });
      throw error;
    }
  },

  clearSelectedLogistics: () => set({ selectedLogistics: null, isDetailLoading: false }),
}));
